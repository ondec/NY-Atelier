<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ShopCatalogueTest extends TestCase
{
    use RefreshDatabase;

    private function seedCatalogue(int $revision = 1, int $price = 1200): void
    {
        $payload = [
            'inventory' => [
                'products' => [['id' => 'piece-1', 'name' => 'A tailored piece', 'description' => 'Made in Accra', 'type' => 'Suits', 'price' => $price, 'photo' => 'https://example.com/piece.jpg', 'wordpressId' => 45, 'sourceUrl' => 'https://example.com/private']],
                'variants' => [
                    ['id' => 'variant-1', 'productId' => 'piece-1', 'colour' => 'Ivory', 'fabric' => '', 'size' => 'M', 'sku' => 'PRIVATE-1', 'quantity' => 9, 'stockVerified' => false, 'reorderAt' => 3],
                    ['id' => 'variant-2', 'productId' => 'piece-1', 'colour' => 'Ivory', 'fabric' => '', 'size' => 'L', 'sku' => 'PRIVATE-2', 'quantity' => 2, 'stockVerified' => true, 'reorderAt' => 3],
                ],
                'visuals' => ['["piece-1","ivory",""]' => ['photo' => 'https://example.com/ivory.jpg']],
                'movements' => [],
            ],
            'collections' => [['id' => 'collection-1', 'title' => 'A collection', 'description' => 'The edit', 'photos' => ['https://example.com/cover.jpg'], 'productIds' => ['piece-1']]],
        ];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => $revision, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_public_catalogue_omits_staff_fields_and_marks_unverified_stock_sold_out(): void
    {
        $this->seedCatalogue();
        $response = $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('products.0.priceMinor', 120000)
            ->assertJsonPath('products.0.colours.0.sizes.0.availability', 'sold_out')
            ->assertJsonPath('products.0.colours.0.sizes.1.availability', 'low')
            ->assertJsonPath('collections.0.productIds.0', 'piece-1');

        $body = $response->getContent();
        foreach (['PRIVATE-1', 'PRIVATE-2', 'wordpressId', 'sourceUrl', 'reorderAt', 'quantity', 'stockVerified', 'variant-1'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
    }

    public function test_a_new_revision_returns_the_new_price(): void
    {
        $this->seedCatalogue();
        $this->getJson('/api/shop/catalogue')->assertJsonPath('products.0.priceMinor', 120000);
        $this->seedCatalogue(2, 1300);
        $this->getJson('/api/shop/catalogue')->assertJsonPath('revision', 2)->assertJsonPath('products.0.priceMinor', 130000);
    }

    public function test_studio_photo_paths_become_full_portal_addresses(): void
    {
        config(['staff.portal_url' => 'https://studio.example.test/']);
        $payload = ['inventory' => [
            'products' => [['id' => 'piece-2', 'name' => 'Uploaded piece', 'price' => 900, 'gallery' => ['/collections/front.jpg', '//elsewhere.test/x.jpg'], 'photo' => 'https://example.com/back.jpg']],
            'variants' => [],
        ], 'collections' => []];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => 7, 'created_at' => now(), 'updated_at' => now()]);

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('products.0.photos.0.src', 'https://studio.example.test/collections/front.jpg')
            ->assertJsonPath('products.0.photos.1.src', 'https://example.com/back.jpg')
            ->assertJsonCount(2, 'products.0.photos');
    }

    public function test_each_site_features_at_most_one_collection_in_display_order(): void
    {
        $payload = ['inventory' => [
            'products' => [['id' => 'piece-1', 'name' => 'Piece', 'price' => 900]],
            'variants' => [],
        ], 'collections' => [
            ['id' => 'second', 'title' => 'Second', 'order' => 2, 'featuredOn' => ['website' => true, 'rtw' => true, 'app' => false], 'photos' => ['https://example.com/2a.jpg', 'https://example.com/2b.jpg'], 'productIds' => ['piece-1']],
            ['id' => 'first', 'title' => 'First', 'order' => 1, 'featuredOn' => ['rtw' => true, 'app' => true], 'photos' => ['https://example.com/1.jpg'], 'productIds' => ['piece-1']],
            ['id' => 'third', 'title' => 'Third', 'order' => 3, 'photos' => [], 'productIds' => []],
        ]];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => 9, 'created_at' => now(), 'updated_at' => now()]);

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('collections.0.id', 'first')
            ->assertJsonPath('collections.0.featuredOn', ['website' => false, 'rtw' => true, 'app' => true])
            ->assertJsonPath('collections.1.id', 'second')
            ->assertJsonPath('collections.1.featuredOn', ['website' => true, 'rtw' => false, 'app' => false])
            ->assertJsonPath('collections.1.photos.1.src', 'https://example.com/2b.jpg')
            ->assertJsonPath('collections.2.featuredOn', ['website' => false, 'rtw' => false, 'app' => false])
            ->assertJsonMissingPath('collections.0.order');
    }

    public function test_a_collection_can_lead_with_a_launch_video_and_a_story(): void
    {
        $payload = ['inventory' => ['products' => [], 'variants' => []], 'collections' => [
            ['id' => 'video', 'title' => 'Video', 'order' => 1, 'photos' => ['https://example.com/1.jpg'], 'productIds' => [], 'heroMode' => 'video', 'heroVideo' => 'https://cdn.example.com/launch.mp4',
                'story' => [
                    ['title' => 'Cut by hand', 'text' => 'Why it is unique.', 'photos' => ['https://example.com/close-1.jpg', 'javascript:alert(1)', '/uploads/close-2.jpg']],
                    ['title' => '', 'text' => '', 'photos' => []],
                    ['title' => '  ', 'text' => 'The cloth.', 'photos' => []],
                ]],
            ['id' => 'photos', 'title' => 'Photos', 'order' => 2, 'photos' => [], 'productIds' => [], 'heroMode' => 'photos', 'heroVideo' => 'https://cdn.example.com/kept-for-later.mp4', 'story' => ['title' => 'Old single chapter', 'text' => '', 'photos' => []]],
            ['id' => 'unsafe', 'title' => 'Unsafe', 'order' => 3, 'photos' => [], 'productIds' => [], 'heroMode' => 'video', 'heroVideo' => 'http://example.com/clip.mp4', 'story' => ['text' => '  ', 'photos' => []]],
            ['id' => 'page', 'title' => 'Page', 'order' => 4, 'photos' => [], 'productIds' => [], 'heroMode' => 'video', 'heroVideo' => 'https://example.com/watch?v=1'],
        ]];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => 11, 'created_at' => now(), 'updated_at' => now()]);

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('collections.0.heroVideo', 'https://cdn.example.com/launch.mp4')
            ->assertJsonCount(2, 'collections.0.story')
            ->assertJsonPath('collections.0.story.0.title', 'Cut by hand')
            ->assertJsonPath('collections.0.story.0.text', 'Why it is unique.')
            ->assertJsonCount(2, 'collections.0.story.0.photos')
            ->assertJsonPath('collections.0.story.0.photos.0.src', 'https://example.com/close-1.jpg')
            ->assertJsonPath('collections.0.story.1.title', null)
            ->assertJsonPath('collections.0.story.1.text', 'The cloth.')
            ->assertJsonPath('collections.1.heroVideo', null)
            ->assertJsonPath('collections.1.story', [])
            ->assertJsonPath('collections.2.heroVideo', null)
            ->assertJsonPath('collections.2.story', [])
            ->assertJsonPath('collections.3.heroVideo', null);
    }

    public function test_site_heroes_are_shared_only_when_custom_and_safe(): void
    {
        $payload = ['inventory' => ['products' => [], 'variants' => []], 'collections' => [], 'heroes' => [
            'website' => ['use' => 'custom', 'style' => 'photos', 'media' => ['/uploads/heroes/a.jpg', 'javascript:alert(1)', 'https://example.com/b.jpg'], 'eyebrow' => 'NEW', 'title' => ' Meet the edit ', 'text' => '', 'buttonLabel' => 'SHOP', 'buttonTo' => 'collection:plum-piping'],
            'rtw' => ['use' => 'default', 'style' => 'photos', 'media' => ['https://example.com/c.jpg']],
            'services' => ['use' => 'custom', 'style' => 'video', 'media' => ['site:/videos/our-story/01.mp4', 'site:/../secret.mp4', '/uploads/heroes/film.mp4', 'https://example.com/page'], 'title' => 'Services', 'buttonLabel' => 'GO', 'buttonTo' => 'https://evil.example'],
        ], 'heroDrafts' => [
            'rtw' => ['use' => 'custom', 'style' => 'photos', 'media' => ['https://example.com/draft.jpg'], 'title' => 'Not yet'],
        ]];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => 12, 'created_at' => now(), 'updated_at' => now()]);
        $portal = rtrim((string) config('staff.portal_url'), '/');

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('heroes.website.media', [$portal.'/uploads/heroes/a.jpg', 'https://example.com/b.jpg'])
            ->assertJsonPath('heroes.website.title', 'Meet the edit')
            ->assertJsonPath('heroes.website.text', null)
            ->assertJsonPath('heroes.website.button', ['label' => 'SHOP', 'to' => 'collection:plum-piping'])
            ->assertJsonMissingPath('heroes.rtw')
            ->assertJsonMissingPath('heroDrafts')
            ->assertJsonPath('heroes.services.style', 'video')
            ->assertJsonPath('heroes.services.media', ['site:/videos/our-story/01.mp4', $portal.'/uploads/heroes/film.mp4'])
            ->assertJsonPath('heroes.services.button', null);
    }

    public function test_new_arrivals_drop_out_after_their_new_until_day(): void
    {
        $this->travelTo(now('Africa/Accra')->setDate(2026, 12, 10)->setTime(12, 0));
        $product = fn (string $id, array $extra): array => ['id' => $id, 'name' => $id, 'price' => 100, 'type' => 'Shirts', ...$extra];
        $payload = ['inventory' => ['products' => [
            $product('today', ['isNew' => true, 'newUntil' => '2026-12-10']),
            $product('ended', ['isNew' => true, 'newUntil' => '2026-12-09']),
            $product('no-date', ['isNew' => true]),
            $product('not-new', ['newUntil' => '2027-01-01']),
        ], 'variants' => []], 'collections' => []];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => 13, 'created_at' => now(), 'updated_at' => now()]);

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('products.0.isNew', true)
            ->assertJsonPath('products.1.isNew', false)
            ->assertJsonPath('products.2.isNew', true)
            ->assertJsonPath('products.3.isNew', false);
    }

    public function test_the_old_feature_on_home_flag_still_features_the_store_and_app(): void
    {
        $payload = ['inventory' => ['products' => [], 'variants' => []], 'collections' => [
            ['id' => 'legacy', 'title' => 'Legacy', 'order' => 1, 'featured' => true, 'photos' => [], 'productIds' => []],
        ]];
        DB::table('studio_catalogues')->updateOrInsert(['id' => 1], ['payload' => json_encode($payload), 'revision' => 10, 'created_at' => now(), 'updated_at' => now()]);

        $this->getJson('/api/shop/catalogue')->assertOk()
            ->assertJsonPath('collections.0.featuredOn', ['website' => false, 'rtw' => true, 'app' => true]);
    }

    public function test_uninitialised_catalogue_returns_empty_lists(): void
    {
        $this->getJson('/api/shop/catalogue')->assertOk()->assertExactJson(['revision' => 0, 'currency' => 'GHS', 'products' => [], 'collections' => [], 'promotions' => []]);
    }
}
