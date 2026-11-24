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
