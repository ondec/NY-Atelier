<?php

namespace App;

class PublicShopCatalogue
{
    /** Sites whose home hero can feature a collection. */
    private const SITES = ['website', 'rtw', 'app'];

    public function serialize(array $payload, int $revision): array
    {
        $inventory = $payload['inventory'] ?? [];
        $products = [];
        $groups = [];

        foreach ($inventory['products'] ?? [] as $product) {
            if (! isset($product['id'], $product['name'], $product['price'])) {
                continue;
            }
            $priceMinor = (int) round((float) $product['price'] * 100);
            $offerMinor = isset($product['offerPrice']) ? (int) round((float) $product['offerPrice'] * 100) : null;
            $products[$product['id']] = [
                'id' => $product['id'],
                'name' => $product['name'],
                'description' => $product['description'] ?? null,
                'type' => $product['type'] ?? 'Other',
                'section' => in_array($product['section'] ?? null, ['men', 'women', 'accessories'], true) ? $product['section'] : null,
                'priceMinor' => $priceMinor,
                'offerPriceMinor' => $offerMinor !== null && $offerMinor > 0 && $offerMinor < $priceMinor ? $offerMinor : null,
                'isNew' => ($product['isNew'] ?? false) === true,
                'sizing' => array_values(array_intersect($product['sizing'] ?? [], ['shirt', 'trousers'])),
                'photos' => $this->photos($product['gallery'] ?? [], $product['photo'] ?? null),
                'colours' => [],
            ];
        }

        foreach ($inventory['variants'] ?? [] as $variant) {
            $productId = $variant['productId'] ?? null;
            if (! isset($products[$productId], $variant['size'])) {
                continue;
            }
            $colour = trim((string) ($variant['colour'] ?? ''));
            $fabric = trim((string) ($variant['fabric'] ?? ''));
            $key = json_encode([$productId, mb_strtolower($colour), mb_strtolower($fabric)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (! isset($groups[$key])) {
                $visual = $inventory['visuals'][$key] ?? [];
                $groups[$key] = [
                    'productId' => $productId,
                    'id' => substr(hash('sha256', $key), 0, 16),
                    'name' => implode(' · ', array_filter([$colour, $fabric])) ?: 'Edition',
                    'fabric' => $fabric ?: null,
                    'swatch' => preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($visual['swatch'] ?? '')) ? $visual['swatch'] : null,
                    'group' => $visual['group'] ?? null,
                    'photos' => $this->photos($visual['gallery'] ?? [], $visual['photo'] ?? null),
                    'sizes' => [],
                ];
            }
            $size = (string) $variant['size'];
            $available = ($variant['stockVerified'] ?? true) !== false ? max(0, (int) ($variant['quantity'] ?? 0)) : 0;
            $groups[$key]['sizes'][$size] = ($groups[$key]['sizes'][$size] ?? 0) + $available;
        }

        foreach ($groups as $group) {
            $productId = $group['productId'];
            $group['sizes'] = array_map(fn ($size, $quantity): array => [
                'label' => (string) $size,
                'availability' => $quantity === 0 ? 'sold_out' : ($quantity <= 2 ? 'low' : 'in_stock'),
            ], array_keys($group['sizes']), array_values($group['sizes']));
            unset($group['productId']);
            $products[$productId]['colours'][] = $group;
        }

        $collections = [];
        foreach ($payload['collections'] ?? [] as $collection) {
            if (! isset($collection['id'], $collection['title'])) {
                continue;
            }
            $photos = $this->photos($collection['photos'] ?? [], null);
            $collections[] = [
                'id' => $collection['id'], 'title' => $collection['title'],
                'copy' => $collection['description'] ?? null,
                'cover' => $photos[0] ?? null,
                'photos' => $photos,
                'featuredOn' => $this->featuredOn($collection),
                'order' => is_int($collection['order'] ?? null) ? $collection['order'] : PHP_INT_MAX,
                'productIds' => array_values(array_filter($collection['productIds'] ?? [], fn ($id): bool => isset($products[$id]))),
            ];
        }

        // NY Office features at most one collection per site; if older data has several, the first in display order wins.
        usort($collections, fn (array $a, array $b): int => $a['order'] <=> $b['order']);
        $taken = [];
        foreach ($collections as &$entry) {
            foreach (self::SITES as $site) {
                $entry['featuredOn'][$site] = $entry['featuredOn'][$site] && ! isset($taken[$site]);
                if ($entry['featuredOn'][$site]) {
                    $taken[$site] = true;
                }
            }
            unset($entry['order']);
        }
        unset($entry);

        return ['revision' => $revision, 'currency' => 'GHS', 'products' => array_values($products), 'collections' => $collections, 'promotions' => []];
    }

    /**
     * Which home heroes show this collection. Older records only had one "Feature on Home"
     * flag, which drove the RTW store and the app, so it maps to those two sites.
     *
     * @return array{website: bool, rtw: bool, app: bool}
     */
    private function featuredOn(array $collection): array
    {
        $flags = $collection['featuredOn'] ?? null;
        if (! is_array($flags)) {
            $legacy = ($collection['featured'] ?? false) === true;

            return ['website' => false, 'rtw' => $legacy, 'app' => $legacy];
        }

        return array_combine(self::SITES, array_map(fn (string $site): bool => ($flags[$site] ?? false) === true, self::SITES));
    }

    private function photos(array $gallery, ?string $photo): array
    {
        $urls = array_unique(array_filter([...$gallery, $photo], fn ($url): bool => is_string($url) && ((str_starts_with($url, '/') && ! str_starts_with($url, '//')) || str_starts_with($url, 'https://'))));

        // Photos uploaded in NY Studio are stored as paths on the staff portal. The store, the
        // website and the app run on other hosts, so send them a full address they can load.
        $portal = rtrim((string) config('staff.portal_url'), '/');

        return array_map(fn ($url): array => ['src' => str_starts_with($url, '/') ? $portal.$url : $url, 'alt' => ''], array_values($urls));
    }
}
