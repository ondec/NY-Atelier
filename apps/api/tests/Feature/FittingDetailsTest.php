<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class FittingDetailsTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): int
    {
        config(['demo.enabled' => true]);
        $this->signInStaff('receptionist');

        return $this->postJson('/api/demo/staff/customers', ['name' => 'Fitting test client', 'phone' => '+233 200 123 456'])->assertCreated()->json('id');
    }

    private function input(array $overrides = []): array
    {
        return array_replace([
            'request_id' => (string) Str::uuid(), 'measured_on' => '2026-01-01',
            'garment_type' => 'kaftan', 'unit' => 'in', 'values' => ['chest' => 40],
        ], $overrides);
    }

    public function test_inch_readings_and_custom_labels_are_saved_in_centimetres_without_changing_weight_or_history(): void
    {
        $customer = $this->customer();
        $url = "/api/demo/staff/customers/$customer";
        $old = $this->postJson("$url/measurements", $this->input(['unit' => 'cm', 'values' => ['chest' => 96]]))->assertCreated()->json('id');
        $this->postJson("$url/measurements", $this->input([
            'values' => ['chest' => 40, 'weight' => 75],
            'additional_measurements' => [['label' => 'Label length', 'value' => 1.25, 'group' => 'Kaftan top']],
        ]))->assertCreated();
        $this->getJson($url)->assertOk()->assertJsonCount(2, 'measurements')
            ->assertJsonPath('measurements.0.values.chest', 101.6)->assertJsonPath('measurements.0.values.weight', 75)
            ->assertJsonPath('measurements.0.unit', 'cm')->assertJsonPath('measurements.0.recorded_unit', 'in')
            ->assertJsonPath('measurements.0.additional_measurements.0.label', 'Label length')
            ->assertJsonPath('measurements.0.additional_measurements.0.value', 3.175)
            ->assertJsonPath('measurements.1.id', $old)->assertJsonPath('measurements.1.values.chest', 96);
    }

    public function test_removed_preset_fields_stay_absent_and_custom_only_fittings_are_allowed(): void
    {
        $customer = $this->customer();
        $url = "/api/demo/staff/customers/$customer";
        $this->postJson("$url/measurements", $this->input([
            'values' => [], 'additional_measurements' => [['label' => 'Label length', 'value' => 2]],
        ]))->assertCreated();
        $this->getJson($url)->assertJsonPath('measurements.0.values', [])->assertJsonPath('measurements.0.additional_measurements.0.value', 5.08);
        $this->postJson("$url/measurements", $this->input(['values' => []]))->assertUnprocessable()->assertJsonValidationErrors('values');
    }

    public function test_added_pieces_keep_their_own_readings_once_each(): void
    {
        $customer = $this->customer();
        $url = "/api/demo/staff/customers/$customer";
        $this->postJson("$url/measurements", $this->input([
            'garment_type' => 'suit', 'values' => ['neck' => 15, 'chest' => 40],
            'pieces' => [['key' => 'shirt-long', 'title' => null, 'values' => ['neck' => 15.5, 'sleeve' => 25]], ['key' => 'custom', 'title' => ' Bow tie ', 'values' => []]],
            'additional_measurements' => [['label' => 'Neck', 'value' => 16, 'group' => 'Bow tie'], ['label' => 'Collar point', 'value' => 3, 'group' => 'Shirt']],
        ]))->assertCreated();
        $this->getJson($url)->assertOk()
            ->assertJsonPath('measurements.0.values.neck', 38.1)
            ->assertJsonPath('measurements.0.pieces.0.title', 'Shirt')->assertJsonPath('measurements.0.pieces.0.values.neck', 39.37)
            ->assertJsonPath('measurements.0.pieces.1.title', 'Bow tie')->assertJsonPath('measurements.0.pieces.1.values', [])
            ->assertJsonPath('pieces', null);

        $suit = ['garment_type' => 'suit', 'values' => ['chest' => 40]];
        // Once per fitting, never a section the garment already has, always named, and never empty.
        $this->postJson("$url/measurements", $this->input([...$suit, 'pieces' => [['key' => 'shirt-long', 'values' => ['neck' => 15]], ['key' => 'custom', 'title' => 'shirt', 'values' => []]],
            'additional_measurements' => [['label' => 'Cuff', 'value' => 1, 'group' => 'shirt']]]))->assertUnprocessable()->assertJsonValidationErrors('pieces.1.title');
        $this->postJson("$url/measurements", $this->input([...$suit, 'pieces' => [['key' => 'jacket', 'values' => ['neck' => 15]]]]))->assertUnprocessable()->assertJsonValidationErrors('pieces.0.title');
        $this->postJson("$url/measurements", $this->input([...$suit, 'pieces' => [['key' => 'custom', 'title' => '', 'values' => []]]]))->assertUnprocessable()->assertJsonValidationErrors('pieces.0.title');
        $this->postJson("$url/measurements", $this->input([...$suit, 'pieces' => [['key' => 'waistcoat', 'values' => []]]]))->assertUnprocessable()->assertJsonValidationErrors('pieces.0.values');
        $this->postJson("$url/measurements", $this->input([...$suit, 'pieces' => [['key' => 'waistcoat', 'values' => ['inseam' => 30]]]]))->assertUnprocessable()->assertJsonValidationErrors('pieces.0.values');
        $this->postJson("$url/measurements", $this->input([...$suit, 'pieces' => [['key' => 'shirt-long', 'values' => ['neck' => 15]]],
            'additional_measurements' => [['label' => 'Neck', 'value' => 1, 'group' => 'Shirt']]]))->assertUnprocessable()->assertJsonValidationErrors('additional_measurements.0.label');
    }

    public function test_photo_and_video_uploads_are_private_persistent_and_not_duplicated_on_retry(): void
    {
        Storage::fake('fittings');
        $customer = $this->customer();
        $url = "/api/demo/staff/customers/$customer";
        $payload = $this->input();
        $upload = fn (): array => ['payload' => json_encode($payload), 'attachments' => [
            UploadedFile::fake()->image('inspiration.png'), UploadedFile::fake()->createWithContent('reference.mp4', str_repeat("\0", 5120))->mimeType('video/mp4'),
        ]];
        $id = $this->post("$url/measurements", $upload(), ['Accept' => 'application/json'])->assertCreated()->json('id');
        $this->post("$url/measurements", $upload(), ['Accept' => 'application/json'])->assertSuccessful()->assertJsonPath('id', $id);
        $response = $this->getJson($url)->assertOk()->assertJsonCount(1, 'measurements')->assertJsonCount(2, 'measurements.0.attachments');
        $this->assertDatabaseCount('fitting_attachments', 2);
        $this->assertCount(2, Storage::disk('fittings')->allFiles());
        foreach (DB::table('fitting_attachments')->get() as $file) {
            Storage::disk('fittings')->assertExists($file->path);
        }
        $media = $response->json('measurements.0.attachments');
        $video = collect($media)->firstWhere('mime_type', 'video/mp4');
        $mediaUrl = "$url/measurements/$id/attachments/{$video['id']}";
        $this->get($mediaUrl)->assertOk()->assertHeader('Content-Type', 'video/mp4')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get($mediaUrl, ['Range' => 'bytes=0-9'])->assertStatus(206)->assertHeader('Content-Range', 'bytes 0-9/5120');
        $other = $this->postJson('/api/demo/staff/customers', ['name' => 'Other fitting client', 'phone' => '+233 200 999 999'])->assertCreated()->json('id');
        $this->get("/api/demo/staff/customers/$other/measurements/$id/attachments/{$video['id']}")->assertNotFound();
        $this->assertArrayNotHasKey('path', $media[0]);
    }

    public function test_invalid_labels_units_and_values_are_rejected_without_saving_a_fitting(): void
    {
        $customer = $this->customer();
        $url = "/api/demo/staff/customers/$customer/measurements";
        foreach ([
            ['unit' => 'feet'], ['values' => ['chest' => -5]], ['values' => ['unexpected_field' => 10]],
            ['additional_measurements' => [['label' => '   ', 'value' => 5]]],
            ['additional_measurements' => [['label' => 'Label length', 'value' => 1], ['label' => 'label length', 'value' => 2]]],
        ] as $changes) {
            $this->postJson($url, $this->input($changes))->assertUnprocessable();
        }
        $this->assertDatabaseCount('customer_measurements', 0);
    }

    public function test_disallowed_and_oversized_uploads_do_not_leave_records_or_files(): void
    {
        Storage::fake('fittings');
        $customer = $this->customer();
        $url = "/api/demo/staff/customers/$customer/measurements";
        $path = tempnam(sys_get_temp_dir(), 'invalid-fitting-');
        file_put_contents($path, '<script>bad</script>');
        try {
            foreach ([new UploadedFile($path, 'fake.png', 'image/png', null, true), UploadedFile::fake()->create('large.mp4', 20481, 'video/mp4')] as $file) {
                $this->post($url, ['payload' => json_encode($this->input()), 'attachments' => [$file]], ['Accept' => 'application/json'])
                    ->assertUnprocessable()->assertJsonValidationErrors('attachments.0');
            }
        } finally {
            @unlink($path);
        }
        $this->assertDatabaseCount('customer_measurements', 0);
        $this->assertDatabaseCount('fitting_attachments', 0);
        $this->assertSame([], Storage::disk('fittings')->allFiles());
    }

    public function test_reusing_another_customers_request_id_cannot_change_or_append_files(): void
    {
        Storage::fake('fittings');
        $customer = $this->customer();
        $payload = $this->input();
        $this->postJson("/api/demo/staff/customers/$customer/measurements", $payload)->assertCreated();
        $other = $this->postJson('/api/demo/staff/customers', ['name' => 'Other fitting client', 'phone' => '+233 200 999 999'])->assertCreated()->json('id');
        $this->post("/api/demo/staff/customers/$other/measurements", [
            'payload' => json_encode($payload), 'attachments' => [UploadedFile::fake()->image('reference.png')],
        ], ['Accept' => 'application/json'])->assertConflict();
        $this->assertDatabaseCount('customer_measurements', 1);
        $this->assertSame([], Storage::disk('fittings')->allFiles());
    }

    public function test_attachment_routes_require_staff_authentication(): void
    {
        $this->getJson('/api/demo/staff/customers/1/measurements/1/attachments/'.Str::uuid())->assertUnauthorized();
    }
}
