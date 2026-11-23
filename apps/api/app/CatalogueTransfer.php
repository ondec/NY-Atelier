<?php

namespace App;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Moves imported WordPress products from one catalogue to another (this Mac → the hosted preview).
 * Only adds: products, sizes and photos that already exist in the receiving catalogue are never changed,
 * and every added size arrives as Not counted with no stock, so counts are entered where the stock is.
 */
class CatalogueTransfer
{
    public const FORMAT = 'ny-atelier-catalogue-transfer';

    public function __construct(private WordPressCatalogueImport $wordpress) {}

    /**
     * @param  array{inventory: array{products: list<array<string, mixed>>, variants: list<array<string, mixed>>, visuals?: array<string, mixed>}}  $catalogue
     * @return array{format: string, version: int, source: string, exported_at: string, products: list<array<string, mixed>>, variants: list<array<string, mixed>>, visuals: list<array{productId: string, colour: string, fabric: string, gallery: list<string>}>}
     */
    public function export(array $catalogue): array
    {
        $products = collect($catalogue['inventory']['products'])->filter(fn (array $product): bool => isset($product['wordpressId']))
            ->map(fn (array $product): array => collect($product)->only(['id', 'name', 'type', 'price', 'wordpressId', 'sourceUrl', 'description', 'photo', 'gallery'])->all())
            ->values();
        $ids = $products->pluck('id')->flip();
        $variants = collect($catalogue['inventory']['variants'])
            ->filter(fn (array $variant): bool => isset($ids[$variant['productId']]) && str_starts_with($variant['id'], 'wp-rtw-variation-'))
            ->map(fn (array $variant): array => collect($variant)->only(['id', 'productId', 'colour', 'fabric', 'size', 'sku', 'reorderAt'])->all())
            ->values();
        $visuals = collect($catalogue['inventory']['visuals'] ?? [])->map(function ($visual, string $key) use ($ids): ?array {
            $parts = json_decode($key, true);
            if (! is_array($parts) || count($parts) !== 3 || ! isset($ids[$parts[0]]) || empty($visual['gallery'])) {
                return null;
            }
            // Only WordPress photo sets travel; the app's own photos (for example Red Clover's) stay where they are.
            try {
                $this->wordpress->images(implode(',', $visual['gallery']));
            } catch (RuntimeException) {
                return null;
            }

            return ['productId' => $parts[0], 'colour' => (string) $parts[1], 'fabric' => (string) $parts[2], 'gallery' => array_values($visual['gallery'])];
        })->filter()->values();

        return ['format' => self::FORMAT, 'version' => 1, 'source' => WordPressCatalogueImport::SITE, 'exported_at' => now()->toIso8601String(),
            'products' => $products->all(), 'variants' => $variants->all(), 'visuals' => $visuals->all()];
    }

    /**
     * @param  array<string, mixed>  $catalogue  the receiving catalogue payload ({inventory, collections})
     * @param  array<string, mixed>  $transfer
     * @return array{catalogue: array<string, mixed>, summary: array{added_products: int, added_sizes: int, added_photo_sets: int, kept_products: list<string>, skipped_sizes: int}}
     */
    public function merge(array $catalogue, array $transfer): array
    {
        $transfer = $this->validate($transfer);
        $products = collect($catalogue['inventory']['products'] ?? [])->keyBy('id')->all();
        $variants = $catalogue['inventory']['variants'] ?? [];
        $visuals = $catalogue['inventory']['visuals'] ?? [];
        $byWordPress = collect($products)->filter(fn (array $product): bool => isset($product['wordpressId']))->mapWithKeys(fn (array $product): array => [$product['wordpressId'] => $product['id']]);
        $summary = ['added_products' => 0, 'added_sizes' => 0, 'added_photo_sets' => 0, 'kept_products' => [], 'skipped_sizes' => 0];

        $target = [];
        foreach ($transfer['products'] as $product) {
            $existingId = isset($products[$product['id']]) ? $product['id'] : ($byWordPress[$product['wordpressId']] ?? null);
            if ($existingId) {
                $existing = $products[$existingId];
                // Staff may have renamed, repriced or re-photographed it here; leave the product itself alone.
                $target[$product['id']] = $existing['id'];
                $summary['kept_products'][] = $existing['name'];

                continue;
            }
            $products[$product['id']] = [...$product, 'createdAt' => now()->toIso8601String()];
            $target[$product['id']] = $product['id'];
            $summary['added_products']++;
        }

        $ids = collect($variants)->pluck('id')->flip();
        $skus = collect($variants)->map(fn (array $variant): string => Str::lower(trim($variant['sku'])))->flip();
        $sizes = collect($variants)->map(fn (array $variant): string => $this->sizeKey($variant['productId'], $variant))->flip();
        foreach ($transfer['variants'] as $variant) {
            $productId = $target[$variant['productId']] ?? null;
            $sku = Str::lower(trim($variant['sku']));
            $size = $productId ? $this->sizeKey($productId, $variant) : null;
            if (! $productId || isset($ids[$variant['id']]) || isset($skus[$sku]) || isset($sizes[$size])) {
                $summary['skipped_sizes']++;

                continue;
            }
            $variants[] = ['id' => $variant['id'], 'productId' => $productId, 'colour' => $variant['colour'] ?? '', 'fabric' => $variant['fabric'] ?? null,
                'size' => $variant['size'], 'sku' => $variant['sku'], 'quantity' => 0, 'stockVerified' => false, 'reorderAt' => $variant['reorderAt'] ?? 2];
            $ids[$variant['id']] = true;
            $skus[$sku] = true;
            $sizes[$size] = true;
            $summary['added_sizes']++;
        }

        foreach ($transfer['visuals'] as $visual) {
            if (! isset($target[$visual['productId']])) {
                continue;
            }
            // Same key shape as WordPressCatalogueImport and the Studio editor: [productId, colour, fabric], lower-cased.
            $newKey = json_encode([$target[$visual['productId']], Str::lower(trim($visual['colour'] ?? '')), Str::lower(trim($visual['fabric'] ?? ''))], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (! isset($visuals[$newKey])) {
                $visuals[$newKey] = ['gallery' => $visual['gallery']];
                $summary['added_photo_sets']++;
            }
        }

        $catalogue['inventory']['products'] = array_values($products);
        $catalogue['inventory']['variants'] = array_values($variants);
        $catalogue['inventory']['visuals'] = $visuals;

        return ['catalogue' => $catalogue, 'summary' => $summary];
    }

    /** @return array{products: list<array<string, mixed>>, variants: list<array<string, mixed>>, visuals: list<array{productId: string, colour: ?string, fabric: ?string, gallery: list<string>}>} */
    private function validate(array $transfer): array
    {
        $data = Validator::make($transfer, [
            'format' => ['required', 'in:'.self::FORMAT], 'version' => ['required', 'integer', 'in:1'],
            'source' => ['required', 'in:'.WordPressCatalogueImport::SITE],
            'products' => ['present', 'array', 'list', 'max:2000'],
            'products.*.id' => ['required', 'string', 'max:150', 'distinct'],
            'products.*.name' => ['required', 'string', 'max:150'],
            'products.*.type' => ['required', 'string', 'max:100'],
            'products.*.price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999'],
            'products.*.wordpressId' => ['required', 'integer', 'min:1', 'distinct'],
            'products.*.sourceUrl' => ['sometimes', 'nullable', 'url:https', 'max:2000', 'starts_with:'.WordPressCatalogueImport::SITE.'/'],
            'products.*.description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'products.*.photo' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'products.*.gallery' => ['sometimes', 'array', 'list', 'max:50'],
            'products.*.gallery.*' => ['string', 'max:2000'],
            'variants' => ['present', 'array', 'list', 'max:20000'],
            'variants.*.id' => ['required', 'string', 'max:150', 'distinct'],
            'variants.*.productId' => ['required', 'string', 'max:150'],
            'variants.*.colour' => ['present', 'nullable', 'string', 'max:100'],
            'variants.*.fabric' => ['sometimes', 'nullable', 'string', 'max:100'],
            'variants.*.size' => ['required', 'string', 'max:30'],
            'variants.*.sku' => ['required', 'string', 'max:150', 'distinct:ignore_case'],
            'variants.*.reorderAt' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'visuals' => ['present', 'array', 'list', 'max:20000'],
            'visuals.*.productId' => ['required', 'string', 'max:150'],
            'visuals.*.colour' => ['present', 'nullable', 'string', 'max:100'],
            'visuals.*.fabric' => ['present', 'nullable', 'string', 'max:100'],
            'visuals.*.gallery' => ['required', 'array', 'list', 'min:1', 'max:50'],
            'visuals.*.gallery.*' => ['string', 'max:2000'],
        ])->validate();

        try {
            foreach ($data['products'] as $product) {
                $this->wordpress->images(implode(',', array_filter([$product['photo'] ?? null, ...($product['gallery'] ?? [])])));
            }
            foreach ($data['visuals'] as $visual) {
                $this->wordpress->images(implode(',', $visual['gallery']));
            }
        } catch (RuntimeException) {
            throw ValidationException::withMessages(['transfer' => 'Photos must be links to rtw.thenyatelier.com uploads.']);
        }
        foreach ($data['variants'] as $variant) {
            if (! ($variant['colour'] ?? '') && empty($variant['fabric'])) {
                throw ValidationException::withMessages(['transfer' => 'Each size needs a colour or fabric.']);
            }
        }

        return $data;
    }

    /** @param array<string, mixed> $variant */
    private function sizeKey(string $productId, array $variant): string
    {
        return json_encode([$productId, Str::lower(trim($variant['colour'] ?? '')), Str::lower(trim($variant['fabric'] ?? '')), Str::lower(trim($variant['size']))], JSON_UNESCAPED_UNICODE);
    }
}
