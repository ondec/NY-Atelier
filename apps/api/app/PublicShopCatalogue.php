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
                'isNew' => $this->isNewArrival($product),
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
                    'group' => in_array($visual['group'] ?? null, ['black', 'blue', 'light', 'brown'], true) ? $visual['group'] : null,
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
                // The featured hero: the campaign photos as a carousel, or a launch video (a link to an MP4/WebM file).
                'heroVideo' => ($collection['heroMode'] ?? 'photos') === 'video' ? $this->videoUrl($collection['heroVideo'] ?? null) : null,
                // The story under the pieces: why the collection is unique, with close-up shots.
                'story' => $this->story($collection),
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

        return ['revision' => $revision, 'currency' => 'GHS', 'products' => array_values($products), 'collections' => $collections, 'heroes' => $this->heroes($payload['heroes'] ?? []), 'promotions' => []];
    }

    /**
     * The custom heroes for the website home, the RTW Store and Services. A site set to "default" (or with nothing
     * to show) is left out, so it keeps its built-in hero (the RTW Store's is the featured collection).
     *
     * @return array<string, array{style: string, media: list<string>, eyebrow: ?string, title: ?string, text: ?string, button: ?array{label: string, to: string}}>
     */
    private function heroes(mixed $heroes): array
    {
        $result = [];
        foreach (['website', 'rtw', 'services'] as $site) {
            $hero = is_array($heroes) ? ($heroes[$site] ?? null) : null;
            if (! is_array($hero) || ($hero['use'] ?? 'default') !== 'custom') {
                continue;
            }
            $style = ($hero['style'] ?? 'photos') === 'video' ? 'video' : 'photos';
            $items = array_slice(is_array($hero['media'] ?? null) ? $hero['media'] : [], 0, 8);
            // "site:/…" is a file already on the website (its own photos and films); the sites load it from there.
            $media = array_values(array_filter(array_map(fn ($url): ?string => match (true) {
                is_string($url) && preg_match('#^site:/[A-Za-z0-9/_.-]+\.(jpe?g|png|webp|avif|mp4|webm)$#i', $url) === 1 && ! str_contains($url, '..') => $url,
                $style === 'video' => $this->videoUrl($url),
                default => $this->photos([$url], null)[0]['src'] ?? null,
            }, $items)));
            if ($media === []) {
                continue;
            }
            $text = fn (string $key): ?string => is_string($hero[$key] ?? null) && trim($hero[$key]) !== '' ? trim($hero[$key]) : null;
            $label = $text('buttonLabel');
            $to = $text('buttonTo');
            $result[$site] = [
                'style' => $style, 'media' => $media,
                'eyebrow' => $text('eyebrow'), 'title' => $text('title'), 'text' => $text('text'),
                'button' => $label && $to && preg_match('/^(services|rtw|appointment|featured|collection:[A-Za-z0-9_-]+)$/', $to) ? ['label' => $label, 'to' => $to] : null,
            ];
        }

        return $result;
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

    /**
     * A piece ticked "Show as a new arrival" stays new until its "New until" day (inclusive), then drops out by
     * itself. Pieces ticked before the date existed stay new until someone unticks them.
     */
    private function isNewArrival(array $product): bool
    {
        if (($product['isNew'] ?? false) !== true) {
            return false;
        }
        $until = $product['newUntil'] ?? null;

        return ! is_string($until) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $until) || $until >= now('Africa/Accra')->toDateString();
    }

    private function photos(array $gallery, ?string $photo): array
    {
        $urls = array_unique(array_filter([...$gallery, $photo], fn ($url): bool => is_string($url) && ((str_starts_with($url, '/') && ! str_starts_with($url, '//')) || str_starts_with($url, 'https://'))));

        // Photos uploaded in NY Studio are stored as paths on the staff portal. The store, the
        // website and the app run on other hosts, so send them a full address they can load.
        $portal = rtrim((string) config('staff.portal_url'), '/');

        return array_map(fn ($url): array => ['src' => str_starts_with($url, '/') ? $portal.$url : $url, 'alt' => ''], array_values($urls));
    }

    /** Only an HTTPS link to a video file the browser can play. */
    private function videoUrl(mixed $url): ?string
    {
        if (! is_string($url) || strlen($url) > 2000) {
            return null;
        }
        // A video kept on NY Team itself (a path like /videos/launch.mp4) becomes a full portal address.
        if (preg_match('#^/[A-Za-z0-9/_.-]+$#', $url) && ! str_contains($url, '..')) {
            $url = rtrim((string) config('staff.portal_url'), '/').$url;
        } elseif (! str_starts_with($url, 'https://')) {
            return null;
        }

        return preg_match('/\.(mp4|webm)$/i', (string) parse_url($url, PHP_URL_PATH)) ? $url : null;
    }

    /**
     * The story under the pieces: up to three chapters, each a heading, text and close-up shots.
     * Older records held a single chapter as one object.
     *
     * @return list<array{title: ?string, text: string, photos: list<array{src: string, alt: string}>}>
     */
    private function story(array $collection): array
    {
        $story = $collection['story'] ?? null;
        $chapters = is_array($story) && array_is_list($story) ? $story : (is_array($story) ? [$story] : []);
        $result = [];
        foreach (array_slice($chapters, 0, 3) as $chapter) {
            if (! is_array($chapter)) {
                continue;
            }
            $text = is_string($chapter['text'] ?? null) ? trim($chapter['text']) : '';
            $photos = array_slice($this->photos(is_array($chapter['photos'] ?? null) ? $chapter['photos'] : [], null), 0, 6);
            if ($text === '' && $photos === []) {
                continue;
            }
            $title = is_string($chapter['title'] ?? null) ? trim($chapter['title']) : '';
            $result[] = ['title' => $title !== '' ? $title : null, 'text' => $text, 'photos' => $photos];
        }

        return $result;
    }
}
