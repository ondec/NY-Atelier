<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RestorePreviewCustomersTest extends TestCase
{
    use RefreshDatabase;

    private array $snapshots = [];

    protected function tearDown(): void
    {
        foreach ($this->snapshots as $file) {
            unlink($file);
        }
        parent::tearDown();
    }

    private function snapshot(?string $path = null): string
    {
        $file = tempnam(sys_get_temp_dir(), 'ny-copy-test-');
        $this->snapshots[] = $file;
        file_put_contents($file, json_encode([
            'version' => 1,
            'customers' => [['id' => 5, 'name' => 'Test customer', 'email' => 'customer@example.test', 'phone' => '0200000000', 'email_verified_at' => '2026-01-01 00:00:00']],
            'measurements' => [['id' => 9, 'customer_id' => 5, 'request_id' => '603840df-f191-45c1-9e6e-f386b91a1229', 'measured_on' => '2026-01-01', 'values' => '{"chest":109.22}', 'recorded_unit' => 'in', 'garment_type' => 'suit']],
            'attachments' => [['id' => '603840df-f191-45c1-9e6e-f386b91a1228', 'measurement_id' => 9, 'path' => $path ?? '5/9/603840df-f191-45c1-9e6e-f386b91a1228.jpg', 'name' => 'reference.jpg', 'mime_type' => 'image/jpeg', 'size' => 5, 'content_base64' => base64_encode('photo'), 'sha256' => hash('sha256', 'photo')]],
        ], JSON_THROW_ON_ERROR));

        return $file;
    }

    public function test_copies_customer_fitting_and_private_media_without_authentication_state(): void
    {
        Storage::fake('fittings');
        config(['preview.enabled' => true]);
        $file = $this->snapshot();

        $this->artisan('staff:restore-preview-customers', ['file' => $file])->assertSuccessful();

        $this->assertDatabaseHas('customers', ['id' => 5, 'name' => 'Test customer', 'email_verified_at' => null]);
        $this->assertDatabaseHas('customer_measurements', ['id' => 9, 'customer_id' => 5, 'recorded_unit' => 'in', 'values' => '{"chest":109.22}']);
        $this->assertDatabaseCount('fitting_attachments', 1);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseCount('customer_auth_events', 0);
        $this->assertSame('photo', Storage::disk('fittings')->get('5/9/603840df-f191-45c1-9e6e-f386b91a1228.jpg'));
    }

    public function test_restart_preserves_edits_restores_missing_media_and_does_not_resurrect_deleted_customers(): void
    {
        Storage::fake('fittings');
        config(['preview.enabled' => true]);
        $file = $this->snapshot();
        $this->artisan('staff:restore-preview-customers', ['file' => $file])->assertSuccessful();
        DB::table('customers')->where('id', 5)->update(['name' => 'Updated name']);
        Storage::disk('fittings')->deleteDirectory('5');

        $this->artisan('staff:restore-preview-customers', ['file' => $file])->assertSuccessful();

        $this->assertDatabaseHas('customers', ['id' => 5, 'name' => 'Updated name']);
        Storage::disk('fittings')->assertExists('5/9/603840df-f191-45c1-9e6e-f386b91a1228.jpg');

        DB::table('customers')->delete();
        $this->artisan('staff:restore-preview-customers', ['file' => $file])->assertSuccessful();

        $this->assertDatabaseCount('customers', 0);
    }

    public function test_does_not_merge_into_an_existing_database(): void
    {
        Storage::fake('fittings');
        config(['preview.enabled' => true]);
        Customer::create(['name' => 'Existing customer', 'email' => 'existing@example.test']);

        $this->artisan('staff:restore-preview-customers', ['file' => $this->snapshot()])->assertSuccessful();

        $this->assertDatabaseCount('customers', 1);
        $this->assertDatabaseCount('customer_measurements', 0);
        $this->assertDatabaseCount('fitting_attachments', 0);
        Storage::disk('fittings')->assertDirectoryEmpty('/');
    }

    public function test_refuses_directory_traversal_before_creating_any_records(): void
    {
        Storage::fake('fittings');
        config(['preview.enabled' => true]);

        $this->artisan('staff:restore-preview-customers', ['file' => $this->snapshot('../escape.jpg')])->assertFailed();

        $this->assertDatabaseCount('customers', 0);
        $this->assertDatabaseCount('customer_measurements', 0);
        Storage::disk('fittings')->assertDirectoryEmpty('/');
    }

    public function test_requires_explicit_preview_mode(): void
    {
        config(['preview.enabled' => false]);

        $this->artisan('staff:restore-preview-customers', ['file' => $this->snapshot()])->assertFailed();

        $this->assertDatabaseCount('customers', 0);
    }
}
