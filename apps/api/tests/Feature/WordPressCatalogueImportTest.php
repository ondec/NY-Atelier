<?php

namespace Tests\Feature;

use App\WordPressCatalogueImport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class WordPressCatalogueImportTest extends TestCase
{
    use RefreshDatabase;

    private function rows(): array
    {
        $defaults = ['ID' => '', 'Type' => 'variation', 'Published' => '1', 'Name' => '', 'Parent' => 'id:25', 'Stock' => '', 'SKU' => '', 'Regular price' => '1200', 'Sale price' => '960.00', 'Images' => '', 'Short description' => '', 'Description' => '', 'Attribute 1 name' => 'Size', 'Attribute 1 value(s)' => 'M'];

        return [array_replace($defaults, ['ID' => '25', 'Type' => 'variable', 'Name' => 'A &amp; B Set', 'Parent' => '', 'Images' => WordPressCatalogueImport::SITE.'/wp-content/uploads/2026/06/full.png', 'Description' => '<p>A fine &amp; comfortable set.</p>']),
            array_replace($defaults, ['ID' => '26', 'Name' => 'A & B Set - M'])];
    }

    private function snapshot(): array
    {
        return ['source' => WordPressCatalogueImport::SITE, 'products' => [['id' => 25, 'slug' => 'a-b-set', 'on_sale' => true, 'prices' => ['currency_code' => 'GHS']]]];
    }

    private function catalogue(): array
    {
        return ['inventory' => ['products' => [], 'variants' => [], 'visuals' => [], 'movements' => []], 'collections' => [['id' => 'keep', 'title' => 'Keep this collection']]];
    }

    public function test_import_preserves_source_identity_full_image_links_prices_and_uncounted_stock(): void
    {
        $importer = new WordPressCatalogueImport;
        $result = $importer->prepare($this->rows(), $this->snapshot(), $this->catalogue());
        $product = $result['catalogue']['inventory']['products'][0];
        $variant = $result['catalogue']['inventory']['variants'][0];
        $this->assertSame('A & B Set', $product['name']);
        $this->assertSame(25, $product['wordpressId']);
        $this->assertEquals(960, $product['price']);
        $this->assertSame('A fine & comfortable set.', $product['description']);
        $this->assertSame([WordPressCatalogueImport::SITE.'/wp-content/uploads/2026/06/full.png'], $product['gallery']);
        $this->assertSame('WP-RTW-26', $variant['sku']);
        $this->assertSame('M', $variant['size']);
        $this->assertSame('As shown', $variant['colour']);
        $this->assertSame(0, $variant['quantity']);
        $this->assertFalse($variant['stockVerified']);
        $this->assertSame($this->catalogue()['collections'], $result['catalogue']['collections']);
        $this->assertSame([], $result['catalogue']['inventory']['movements']);
    }

    public function test_reimport_does_not_duplicate_products_or_overwrite_a_staff_count(): void
    {
        $importer = new WordPressCatalogueImport;
        $first = $importer->prepare($this->rows(), $this->snapshot(), $this->catalogue())['catalogue'];
        $first['inventory']['variants'][0]['quantity'] = 17;
        $first['inventory']['variants'][0]['stockVerified'] = true;
        $first['inventory']['variants'][0]['sku'] = 'STAFF-SKU';
        $first['inventory']['movements'][] = ['id' => 'count', 'note' => 'Counted by staff'];
        $second = $importer->prepare($this->rows(), $this->snapshot(), $first);
        $this->assertSame($first, $second['catalogue']);
        $this->assertSame(0, $second['report']['new_variants']);
    }

    public function test_a_reviewed_existing_app_product_keeps_its_id_stock_and_collection_membership(): void
    {
        $rows = $this->rows();
        $rows[0]['ID'] = '30110';
        $rows[0]['Name'] = 'Aegis Set';
        $rows[1]['Parent'] = 'id:30110';
        $snapshot = $this->snapshot();
        $snapshot['products'][0]['id'] = 30110;
        $base = $this->catalogue();
        $base['inventory']['products'][] = ['id' => 'shop-aegis', 'name' => 'Aegis Set', 'type' => 'Two-piece sets', 'price' => 1150];
        $base['inventory']['variants'][] = ['id' => 'original', 'productId' => 'shop-aegis', 'sku' => 'EXISTING', 'quantity' => 6, 'colour' => 'Navy', 'size' => 'L'];
        $result = (new WordPressCatalogueImport)->prepare($rows, $snapshot, $base);
        $this->assertCount(1, $result['catalogue']['inventory']['products']);
        $this->assertSame('shop-aegis', $result['catalogue']['inventory']['products'][0]['id']);
        $this->assertSame($base['inventory']['variants'][0], $result['catalogue']['inventory']['variants'][0]);
        $this->assertSame('shop-aegis', $result['catalogue']['inventory']['variants'][1]['productId']);
    }

    public function test_drafts_and_ambiguous_variations_are_held_without_inventing_sizes_or_prices(): void
    {
        $rows = $this->rows();
        $rows[] = [...$rows[1], 'ID' => '27', 'Attribute 1 value(s)' => ''];
        $rows[] = [...$rows[1], 'ID' => '28', 'Regular price' => '', 'Sale price' => ''];
        $rows[] = [...$rows[0], 'ID' => '29', 'Published' => '-1'];
        $result = (new WordPressCatalogueImport)->prepare($rows, $this->snapshot(), $this->catalogue());
        $this->assertCount(1, $result['catalogue']['inventory']['products']);
        $this->assertCount(1, $result['catalogue']['inventory']['variants']);
        $this->assertCount(2, $result['report']['skipped_variations']);
    }

    public function test_different_size_prices_are_never_flattened_into_one_price(): void
    {
        $rows = $this->rows();
        $rows[] = [...$rows[1], 'ID' => '27', 'Sale price' => '1000', 'Attribute 1 value(s)' => 'L'];
        $result = (new WordPressCatalogueImport)->prepare($rows, $this->snapshot(), $this->catalogue());
        $this->assertSame([], $result['catalogue']['inventory']['products']);
        $this->assertSame('No single confirmed product price. Style held for review.', $result['report']['review'][0]['reason']);
    }

    public function test_non_wordpress_images_are_rejected_instead_of_fetching_arbitrary_urls(): void
    {
        $rows = $this->rows();
        $rows[0]['Images'] = 'https://untrusted.example/private.png';
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Unsupported WordPress image URL.');
        (new WordPressCatalogueImport)->prepare($rows, $this->snapshot(), $this->catalogue());
    }

    public function test_csv_preview_apply_backup_revision_and_repeat_are_safe(): void
    {
        $this->freezeTime();
        $directory = storage_path('framework/testing/wordpress-'.Str::uuid());
        File::makeDirectory($directory, 0700, true);
        try {
            $stream = fopen($directory.'/products.csv', 'wb');
            fwrite($stream, "\xEF\xBB\xBF");
            fputcsv($stream, array_keys($this->rows()[0]), ',', '"', '');
            foreach ($this->rows() as $row) {
                fputcsv($stream, array_values($row), ',', '"', '');
            }
            fclose($stream);
            file_put_contents($directory.'/snapshot.json', json_encode($this->snapshot()));
            $before = json_encode($this->catalogue());
            DB::table('studio_catalogues')->insert(['id' => 1, 'payload' => $before, 'revision' => 4, 'created_at' => now(), 'updated_at' => now()]);
            $arguments = ['csv' => $directory.'/products.csv', 'snapshot' => $directory.'/snapshot.json'];
            $this->artisan('catalogue:import-wordpress', $arguments)->assertSuccessful();
            $this->assertSame($before, DB::table('studio_catalogues')->value('payload'));
            $this->artisan('catalogue:import-wordpress', [...$arguments, '--apply' => true, '--revision' => 3, '--backup' => $directory.'/backup.json'])->assertFailed();
            $this->assertFileDoesNotExist($directory.'/backup.json');
            $this->artisan('catalogue:import-wordpress', [...$arguments, '--apply' => true, '--revision' => 4, '--backup' => $directory.'/backup.json'])->assertSuccessful();
            $this->assertSame(5, DB::table('studio_catalogues')->value('revision'));
            $this->assertSame($this->catalogue(), json_decode(file_get_contents($directory.'/backup.json'), true)['payload']);
            $this->artisan('catalogue:import-wordpress', [...$arguments, '--apply' => true, '--revision' => 5])->assertSuccessful();
            $this->assertSame(5, DB::table('studio_catalogues')->value('revision'));
        } finally {
            File::deleteDirectory($directory);
        }
    }
}
