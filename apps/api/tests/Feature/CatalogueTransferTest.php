<?php

namespace Tests\Feature;

use App\CatalogueTransfer;
use App\WordPressCatalogueImport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class CatalogueTransferTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/demo/staff/studio/catalogue/transfer';

    private const PHOTO = WordPressCatalogueImport::SITE.'/wp-content/uploads/2026/11/set.jpg';

    /** The hosted catalogue: one product staff have already renamed and counted. */
    private function hosted(): array
    {
        return ['inventory' => [
            'products' => [['id' => 'shop-ember', 'name' => 'Ember (renamed by staff)', 'type' => 'Kaftans', 'price' => 900, 'photo' => '/ember.jpg', 'gallery' => ['/ember.jpg']]],
            'variants' => [['id' => 'ember-black-m', 'productId' => 'shop-ember', 'colour' => 'Black', 'size' => 'M', 'sku' => 'EM-BL-M', 'quantity' => 5, 'reorderAt' => 2]],
            'visuals' => [], 'movements' => [['id' => 'm1', 'variantId' => 'ember-black-m', 'change' => 5, 'reason' => 'Received', 'note' => 'Count', 'occurredAt' => '2026-11-20T10:00:00Z']],
        ], 'collections' => [['id' => 'keep', 'title' => 'Keep this', 'description' => '', 'photos' => [], 'productIds' => ['shop-ember'], 'featured' => true, 'order' => 1]]];
    }

    /** A local catalogue after the WordPress import: the matched product plus one new style. */
    private function local(): array
    {
        return ['inventory' => [
            'products' => [
                ['id' => 'shop-ember', 'name' => 'Ember', 'type' => 'Kaftans', 'price' => 950, 'wordpressId' => 31648, 'photo' => self::PHOTO, 'gallery' => [self::PHOTO], 'sourceUrl' => WordPressCatalogueImport::SITE.'/product/ember/'],
                ['id' => 'wp-rtw-25', 'name' => 'Night Mosaic', 'type' => 'Two-piece sets', 'price' => 1200, 'wordpressId' => 25, 'photo' => self::PHOTO, 'gallery' => [self::PHOTO], 'description' => 'Printed set.'],
                ['id' => 'local-only', 'name' => 'Made locally', 'type' => 'Other', 'price' => 10],
            ],
            'variants' => [
                ['id' => 'demo-ember-m', 'productId' => 'shop-ember', 'colour' => 'Black', 'size' => 'M', 'sku' => 'EM-LOCAL', 'quantity' => 9, 'reorderAt' => 2],
                ['id' => 'wp-rtw-variation-1', 'productId' => 'shop-ember', 'colour' => 'Black', 'size' => 'M', 'sku' => 'WP-RTW-1', 'quantity' => 0, 'stockVerified' => false, 'reorderAt' => 2],
                ['id' => 'wp-rtw-variation-2', 'productId' => 'shop-ember', 'colour' => 'Black', 'size' => 'L', 'sku' => 'WP-RTW-2', 'quantity' => 0, 'stockVerified' => false, 'reorderAt' => 2],
                ['id' => 'wp-rtw-variation-3', 'productId' => 'wp-rtw-25', 'colour' => 'As shown', 'size' => 'M', 'sku' => 'WP-RTW-3', 'quantity' => 4, 'stockVerified' => true, 'reorderAt' => 2],
            ],
            'visuals' => ['["wp-rtw-25","as shown",""]' => ['gallery' => [self::PHOTO]], '["local-only","red",""]' => ['gallery' => ['/red.jpg']],
                '["shop-ember","black",""]' => ['gallery' => ['/collections/ember-black.png']]],
            'movements' => [],
        ], 'collections' => []];
    }

    private function transfer(): array
    {
        return app(CatalogueTransfer::class)->export($this->local());
    }

    private function hostedPayload(): array
    {
        return json_decode(DB::table('studio_catalogues')->where('id', 1)->value('payload'), true);
    }

    private function setUpHosted(): void
    {
        DB::table('studio_catalogues')->insert(['id' => 1, 'payload' => json_encode($this->hosted()), 'revision' => 7, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_export_keeps_only_wordpress_products_without_stock_counts(): void
    {
        $transfer = $this->transfer();

        $this->assertSame(['shop-ember', 'wp-rtw-25'], array_column($transfer['products'], 'id'));
        $this->assertSame(['wp-rtw-variation-1', 'wp-rtw-variation-2', 'wp-rtw-variation-3'], array_column($transfer['variants'], 'id'));
        $this->assertArrayNotHasKey('quantity', $transfer['variants'][2]);
        $this->assertSame([['productId' => 'wp-rtw-25', 'colour' => 'as shown', 'fabric' => '', 'gallery' => [self::PHOTO]]], $transfer['visuals']);
    }

    public function test_preview_changes_nothing_and_apply_adds_only_new_items_as_not_counted(): void
    {
        $this->setUpHosted();
        $owner = $this->signInStaff('owner');

        $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => false])->assertOk()
            ->assertJson(['revision' => 7, 'summary' => ['added_products' => 1, 'added_sizes' => 2, 'added_photo_sets' => 1, 'kept_products' => ['Ember (renamed by staff)'], 'skipped_sizes' => 1]]);
        $this->assertSame($this->hosted(), $this->hostedPayload());

        $backup = $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => true, 'revision' => 7])->assertOk()
            ->assertJsonPath('revision', 8)->json('backup');

        $catalogue = $this->hostedPayload();
        $products = collect($catalogue['inventory']['products'])->keyBy('id');
        $variants = collect($catalogue['inventory']['variants'])->keyBy('id');
        $this->assertSame($this->hosted()['inventory']['products'][0], $products['shop-ember']);
        $this->assertSame('Night Mosaic', $products['wp-rtw-25']['name']);
        $this->assertFalse($products->has('local-only'));
        $this->assertSame(5, $variants['ember-black-m']['quantity']);
        $this->assertFalse($variants->has('wp-rtw-variation-1'), 'Ember Black M already exists here.');
        $this->assertSame(['productId' => 'shop-ember', 'quantity' => 0, 'stockVerified' => false], collect($variants['wp-rtw-variation-2'])->only(['productId', 'quantity', 'stockVerified'])->all());
        $this->assertSame(0, $variants['wp-rtw-variation-3']['quantity'], 'Counts from another catalogue are never copied.');
        $this->assertFalse($variants['wp-rtw-variation-3']['stockVerified']);
        $this->assertSame([self::PHOTO], $catalogue['inventory']['visuals']['["wp-rtw-25","as shown",""]']['gallery']);
        $this->assertSame($this->hosted()['inventory']['movements'], $catalogue['inventory']['movements']);
        $this->assertSame($this->hosted()['collections'], $catalogue['collections']);
        $this->assertDatabaseHas('studio_catalogue_backups', ['id' => $backup, 'revision_before' => 7, 'revision_after' => 8, 'created_by' => $owner->id]);

        $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => true, 'revision' => 8])->assertStatus(422);
    }

    public function test_undo_restores_the_catalogue_only_while_nothing_else_has_been_saved(): void
    {
        $this->setUpHosted();
        $this->signInStaff('owner');
        $backup = $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => true, 'revision' => 7])->json('backup');

        $this->postJson(self::URL."/{$backup}/undo")->assertOk()->assertJsonPath('revision', 9);
        $this->assertSame($this->hosted(), $this->hostedPayload());
        $this->postJson(self::URL."/{$backup}/undo")->assertConflict();

        $again = $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => true, 'revision' => 9])->json('backup');
        DB::table('studio_catalogues')->where('id', 1)->increment('revision');
        $this->postJson(self::URL."/{$again}/undo")->assertConflict();
        $this->assertSame('Night Mosaic', collect($this->hostedPayload()['inventory']['products'])->firstWhere('id', 'wp-rtw-25')['name']);
    }

    public function test_a_stale_revision_is_refused_without_changes(): void
    {
        $this->setUpHosted();
        $this->signInStaff('owner');

        $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => true, 'revision' => 6])->assertConflict();
        $this->assertSame($this->hosted(), $this->hostedPayload());
        $this->assertDatabaseCount('studio_catalogue_backups', 0);
    }

    public function test_only_owners_can_import_and_photos_must_come_from_the_wordpress_site(): void
    {
        $this->setUpHosted();
        $this->signInStaff('manager');
        $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => false])->assertForbidden();

        $this->signInStaff('owner');
        $transfer = $this->transfer();
        $transfer['products'][1]['gallery'] = ['https://example.com/wp-content/uploads/x.jpg'];
        $this->postJson(self::URL, ['transfer' => $transfer, 'apply' => false])->assertUnprocessable();
        $transfer = $this->transfer();
        $transfer['format'] = 'something-else';
        $this->postJson(self::URL, ['transfer' => $transfer, 'apply' => false])->assertUnprocessable();
    }

    public function test_guests_cannot_import(): void
    {
        $this->setUpHosted();
        $this->postJson(self::URL, ['transfer' => $this->transfer(), 'apply' => false])->assertUnauthorized();
    }

    public function test_export_command_writes_a_new_private_file_and_never_overwrites(): void
    {
        DB::table('studio_catalogues')->insert(['id' => 1, 'payload' => json_encode($this->local()), 'revision' => 2, 'created_at' => now(), 'updated_at' => now()]);
        $path = storage_path('framework/testing/transfer-'.uniqid().'.json');
        File::ensureDirectoryExists(dirname($path));
        try {
            $this->artisan('catalogue:export-wordpress-transfer', ['path' => $path])->assertSuccessful();
            $this->assertSame('0600', substr(sprintf('%o', fileperms($path)), -4));
            $this->assertSame(CatalogueTransfer::FORMAT, json_decode(File::get($path), true)['format']);
            $this->artisan('catalogue:export-wordpress-transfer', ['path' => $path])->assertFailed();
        } finally {
            File::delete($path);
        }
    }
}
