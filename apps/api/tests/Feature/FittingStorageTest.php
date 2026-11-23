<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class FittingStorageTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: string, 1: string} attachment URL and stored path */
    private function attachment(string $mime = 'video/mp4'): array
    {
        $customer = Customer::query()->create(['name' => 'Ama', 'phone' => '024 000 0000']);
        $measurement = DB::table('customer_measurements')->insertGetId(['customer_id' => $customer->id, 'request_id' => (string) Str::uuid(),
            'measured_on' => now()->toDateString(), 'values' => '{}', 'created_at' => now(), 'updated_at' => now()]);
        $id = (string) Str::uuid();
        $path = "{$customer->id}/{$measurement}/{$id}.mp4";
        DB::table('fitting_attachments')->insert(['id' => $id, 'measurement_id' => $measurement, 'path' => $path, 'name' => 'walk.mp4',
            'mime_type' => $mime, 'size' => 10, 'created_at' => now(), 'updated_at' => now()]);

        return ["/api/demo/staff/customers/{$customer->id}/measurements/{$measurement}/attachments/{$id}", $path];
    }

    public function test_the_r2_setting_switches_fitting_files_to_a_private_bucket(): void
    {
        $this->assertSame('local', config('filesystems.disks.fittings.driver'));
        putenv('FITTINGS_STORAGE=r2');
        try {
            $config = require config_path('filesystems.php');
        } finally {
            putenv('FITTINGS_STORAGE');
        }
        $this->assertSame('s3', $config['disks']['fittings']['driver']);
        $this->assertSame('auto', $config['disks']['fittings']['region']);
        $this->assertTrue($config['disks']['fittings']['use_path_style_endpoint']);
        $this->assertSame('private', $config['disks']['fittings']['visibility']);
    }

    public function test_files_in_r2_are_relayed_with_byte_ranges_and_no_bucket_link(): void
    {
        [$url, $path] = $this->attachment();
        config(['filesystems.disks.fittings.driver' => 's3']);
        $disk = Mockery::mock(Filesystem::class);
        $disk->shouldReceive('exists')->with($path)->andReturnTrue();
        $disk->shouldReceive('temporaryUrl')->with($path, Mockery::any())->andReturn('https://bucket.r2.test/signed?X-Amz-Signature=abc');
        Storage::shouldReceive('disk')->with('fittings')->andReturn($disk);
        Http::fake(['bucket.r2.test/*' => Http::response('01234', 206, ['Content-Range' => 'bytes 0-4/10', 'Content-Length' => '5'])]);
        $this->signInStaff('records');

        $response = $this->get($url, ['Range' => 'bytes=0-4'])->assertStatus(206)
            ->assertHeader('Content-Range', 'bytes 0-4/10')->assertHeader('Accept-Ranges', 'bytes')
            ->assertHeader('Content-Type', 'video/mp4')->assertHeader('Cache-Control', 'no-store, private');
        $this->assertSame('01234', $response->streamedContent());
        $this->assertStringNotContainsString('r2.test', implode(' ', array_map(fn ($values) => implode(',', $values), $response->headers->all())));
        Http::assertSent(fn (HttpRequest $request): bool => $request->hasHeader('Range', 'bytes=0-4'));
    }

    public function test_a_file_missing_from_storage_is_not_found(): void
    {
        [$url] = $this->attachment();
        Storage::fake('fittings');
        $this->signInStaff('records');
        $this->get($url)->assertNotFound();
    }
}
