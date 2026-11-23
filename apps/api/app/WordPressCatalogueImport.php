<?php

namespace App;

use Illuminate\Support\Str;
use RuntimeException;

class WordPressCatalogueImport
{
    public const SITE = 'https://rtw.thenyatelier.com';

    // Reviewed against this site's published IDs, preserving the original app IDs and linked records.
    private const EXISTING_PRODUCTS = [
        31648 => 'shop-ember', 31633 => 'shop-heritage-stripe-navy', 31624 => 'shop-redclover-navy',
        31168 => 'shop-old-money', 30110 => 'shop-aegis', 31076 => 'shop-milano-pants',
        31438 => 'shop-amani', 30598 => 'shop-arctic', 31564 => 'shop-aurel-tunic',
    ];

    public function readCsv(string $path): array
    {
        if (! is_file($path) || filesize($path) > 20 * 1024 * 1024) {
            throw new RuntimeException('Choose a WooCommerce product CSV under 20 MB.');
        }
        $stream = fopen($path, 'rb');
        try {
            $headers = fgetcsv($stream, null, ',', '"', '');
            if (! $headers) {
                throw new RuntimeException('The CSV is empty.');
            }
            $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);
            foreach (['ID', 'Type', 'Published', 'Name', 'Parent', 'Stock', 'Regular price', 'Sale price', 'Images'] as $column) {
                if (! in_array($column, $headers, true)) {
                    throw new RuntimeException('Missing WooCommerce column: '.$column);
                }
            }
            $rows = [];
            $seen = [];
            while (($values = fgetcsv($stream, null, ',', '"', '')) !== false) {
                if ($values === [null]) {
                    continue;
                }
                if (count($values) !== count($headers) || count($rows) >= 50000) {
                    throw new RuntimeException('Invalid CSV row or too many products.');
                }
                $row = array_combine($headers, $values);
                if (! preg_match('/^[1-9][0-9]*$/', $row['ID']) || isset($seen[$row['ID']])) {
                    throw new RuntimeException('Invalid or duplicate WordPress product ID.');
                }
                $seen[$row['ID']] = true;
                $rows[] = $row;
            }

            return $rows;
        } finally {
            fclose($stream);
        }
    }

    public function prepare(array $rows, array $snapshot, array $catalogue): array
    {
        if (($snapshot['source'] ?? '') !== self::SITE || ! is_array($snapshot['products'] ?? null)) {
            throw new RuntimeException('Use the published catalogue snapshot from '.self::SITE.'.');
        }
        $published = collect($snapshot['products'])->keyBy('id');
        $products = collect($catalogue['inventory']['products'])->keyBy('id')->all();
        $variants = collect($catalogue['inventory']['variants'])->keyBy('id')->all();
        $visuals = $catalogue['inventory']['visuals'] ?? [];
        $children = collect($rows)->where('Type', 'variation')->where('Published', '1')->groupBy('Parent');
        $report = ['styles' => 0, 'matched_styles' => 0, 'new_styles' => 0, 'new_variants' => 0, 'skipped_variations' => [], 'review' => [], 'image_urls' => []];
        foreach ($rows as $parent) {
            $wpId = (int) $parent['ID'];
            if ($parent['Type'] !== 'variable' || $parent['Published'] !== '1' || ! $published->has($wpId)) {
                continue;
            }
            $public = $published->get($wpId);
            if (($public['prices']['currency_code'] ?? '') !== 'GHS' || ($public['is_password_protected'] ?? false)) {
                throw new RuntimeException('Unsupported currency or protected product: '.$wpId);
            }
            $candidates = [];
            $confirmedPrices = [];
            foreach ($children->get('id:'.$wpId, collect()) as $row) {
                $attributes = $this->attributes($row);
                $size = $attributes['size'] ?? '';
                $colour = $attributes['color'] ?? $attributes['colour'] ?? 'As shown';
                $rawPrice = ($public['on_sale'] ?? false) ? ($row['Sale price'] ?: $row['Regular price']) : $row['Regular price'];
                if (is_numeric($rawPrice) && (float) $rawPrice > 0) {
                    $confirmedPrices[] = round((float) $rawPrice, 2);
                }
                if (! $size || ! $colour || ! is_numeric($rawPrice) || (float) $rawPrice <= 0) {
                    $report['skipped_variations'][] = ['id' => (int) $row['ID'], 'product' => $this->text($parent['Name']), 'reason' => 'Missing price or unspecified size/colour; review in WordPress.'];

                    continue;
                }
                if (mb_strlen($size) > 30 || mb_strlen($colour) > 100) {
                    throw new RuntimeException('A variation label is too long: '.$row['ID']);
                }
                $candidates[] = ['row' => $row, 'size' => $size, 'colour' => $colour, 'price' => round((float) $rawPrice, 2)];
            }
            $prices = array_values(array_unique($confirmedPrices));
            if (count($prices) !== 1) {
                // The staff app currently prices per product, so differing size prices must not be flattened.
                $report['review'][] = ['id' => $wpId, 'name' => $this->text($parent['Name']), 'reason' => 'No single confirmed product price. Style held for review.'];

                continue;
            }
            $existing = collect($products)->firstWhere('wordpressId', $wpId);
            $id = $existing['id'] ?? (isset(self::EXISTING_PRODUCTS[$wpId], $products[self::EXISTING_PRODUCTS[$wpId]]) ? self::EXISTING_PRODUCTS[$wpId] : 'wp-rtw-'.$wpId);
            $previous = $products[$id] ?? null;
            $photos = $this->images($parent['Images']);
            $name = $this->text($parent['Name']);
            $type = $previous['type'] ?? $this->clothingType($name);
            if ($type === 'Other') {
                $report['review'][] = ['id' => $wpId, 'name' => $name, 'reason' => 'Clothing type needs review; imported as Other.'];
            }
            $products[$id] = [...($previous ?? []), 'id' => $id, 'name' => $name, 'type' => $type, 'price' => $prices[0],
                'wordpressId' => $wpId, 'sourceUrl' => self::SITE.'/product/'.$public['slug'].'/',
                'description' => mb_substr($this->text($parent['Short description'] ?: $parent['Description']), 0, 20000),
                'gallery' => $photos, 'photo' => $photos[0] ?? null];
            $report['styles']++;
            $report[$previous ? 'matched_styles' : 'new_styles']++;
            $report['image_urls'] = [...$report['image_urls'], ...$photos];
            foreach ($candidates as $candidate) {
                ['row' => $row, 'size' => $size, 'colour' => $colour] = $candidate;
                $variantId = 'wp-rtw-variation-'.$row['ID'];
                if (isset($variants[$variantId])) {
                    // Re-importing never overwrites staff stock counts, SKUs, size labels or stock history.
                    continue;
                }
                $stock = trim($row['Stock']);
                $known = $stock !== '' && ctype_digit($stock);
                if ($stock !== '' && ! $known) {
                    throw new RuntimeException('Invalid stock quantity for variation '.$row['ID']);
                }
                $sku = $row['SKU'] ?: 'WP-RTW-'.$row['ID'];
                if (collect($variants)->contains(fn (array $variant): bool => Str::lower(trim($variant['sku'])) === Str::lower(trim($sku)))) {
                    throw new RuntimeException('SKU already belongs to another variant: '.$sku);
                }
                $variants[$variantId] = ['id' => $variantId, 'productId' => $id, 'colour' => $colour, 'size' => $size,
                    'sku' => $sku, 'quantity' => $known ? (int) $stock : 0,
                    'stockVerified' => $known, 'reorderAt' => 2];
                $report['new_variants']++;
                $variantPhotos = $this->images($row['Images']);
                if ($variantPhotos) {
                    $key = json_encode([$id, Str::lower(trim($colour)), ''], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    $visuals[$key] ??= ['gallery' => $variantPhotos];
                    $report['image_urls'] = [...$report['image_urls'], ...$variantPhotos];
                }
            }
        }
        $catalogue['inventory']['products'] = array_values($products);
        $catalogue['inventory']['variants'] = array_values($variants);
        $catalogue['inventory']['visuals'] = $visuals;
        $report['image_urls'] = array_values(array_unique($report['image_urls']));
        $report['stock_note'] = 'New variants without recorded counts are Not counted and unavailable for sale. Existing stock and movements are preserved. WP-RTW SKUs are app-generated where WordPress has none.';

        return ['catalogue' => $catalogue, 'report' => $report];
    }

    private function attributes(array $row): array
    {
        $attributes = [];
        for ($index = 1; isset($row['Attribute '.$index.' name']); $index++) {
            $name = Str::lower(trim($row['Attribute '.$index.' name']));
            if ($name) {
                $attributes[$name] = $this->text($row['Attribute '.$index.' value(s)'] ?? '');
            }
        }

        return $attributes;
    }

    private function images(string $value): array
    {
        $images = array_filter(array_map('trim', explode(',', $value)));
        foreach ($images as $url) {
            $parts = parse_url($url);
            if (! $parts || ($parts['scheme'] ?? '') !== 'https' || ($parts['host'] ?? '') !== 'rtw.thenyatelier.com'
                || isset($parts['user']) || isset($parts['pass']) || isset($parts['port']) || ! str_starts_with($parts['path'] ?? '', '/wp-content/uploads/')
                || ! preg_match('/\.(png|jpe?g|webp|gif)$/i', $parts['path'])) {
                throw new RuntimeException('Unsupported WordPress image URL.');
            }
        }

        return array_values(array_unique($images));
    }

    private function text(string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', strip_tags(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'))));
    }

    private function clothingType(string $name): string
    {
        $name = Str::lower($name);
        foreach (['Agbadas' => '/agbada/', 'Kaftans' => '/kaftan/', 'Suits' => '/\bsuit\b/', 'Trousers' => '/trouser|pants/', 'Dresses' => '/dress/', 'Skirts' => '/skirt/', 'Two-piece sets' => '/\bset\b|\bduo\b/', 'Tops & shirts' => '/shirt|tunic|\btop\b/'] as $type => $pattern) {
            if (preg_match($pattern, $name)) {
                return $type;
            }
        }

        return 'Other';
    }
}
