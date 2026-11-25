<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

#[Signature('staff:restore-preview-customers {file}')]
#[Description('Restore an explicitly supplied private customer snapshot into an empty preview database')]
class RestorePreviewCustomers extends Command
{
    public function handle(): int
    {
        $file = $this->argument('file');
        if (! config('preview.enabled') || ! is_file($file) || filesize($file) > 1000000) {
            $this->error('A private snapshot under 1 MB and preview mode are required.');

            return self::FAILURE;
        }
        $data = json_decode(file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
        if (($data['version'] ?? null) !== 1 || ! is_array($data['customers'] ?? null) || ! is_array($data['measurements'] ?? null) || ! is_array($data['attachments'] ?? null)) {
            $this->error('Unsupported customer snapshot.');

            return self::FAILURE;
        }
        $files = [];
        foreach ($data['attachments'] as $row) {
            $bytes = base64_decode($row['content_base64'] ?? '', true);
            if (! preg_match('~^[1-9][0-9]*/[1-9][0-9]*/[a-f0-9-]{36}\.[a-z0-9]{2,6}$~D', $row['path'] ?? '') || $bytes === false || strlen($bytes) !== ($row['size'] ?? null) || hash('sha256', $bytes) !== ($row['sha256'] ?? null)) {
                $this->error('Invalid snapshot attachment.');

                return self::FAILURE;
            }
            $files[$row['id']] = $bytes;
        }

        $copied = DB::transaction(function () use ($data): bool {
            // The marker survives restarts, and prevents deleted customers being recreated.
            if (Cache::has('preview.customer-copy.applied') || DB::table('customers')->exists() || DB::table('customer_measurements')->exists()) {
                return false;
            }
            foreach ($data['customers'] as $row) {
                DB::table('customers')->insert(Arr::only($row, ['id', 'name', 'email', 'phone', 'account_reference', 'created_at', 'updated_at']));
            }
            foreach ($data['measurements'] as $row) {
                DB::table('customer_measurements')->insert(Arr::only($row, ['id', 'request_id', 'customer_id', 'measured_on', 'values', 'notes', 'garment_type', 'recorded_unit', 'additional_measurements', 'pieces', 'created_at', 'updated_at']));
            }
            foreach ($data['attachments'] as $row) {
                DB::table('fitting_attachments')->insert(Arr::only($row, ['id', 'measurement_id', 'path', 'name', 'mime_type', 'size', 'created_at', 'updated_at']));
            }
            if (DB::getDriverName() === 'pgsql') {
                foreach (['customers', 'customer_measurements'] as $table) {
                    DB::select("SELECT setval(pg_get_serial_sequence(?, 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM {$table}), 0), 1), EXISTS(SELECT 1 FROM {$table}))", [$table]);
                }
            }
            Cache::forever('preview.customer-copy.applied', true);

            return true;
        });

        // Only restore files still referenced by the same fitting. Never overwrite edits.
        foreach ($data['attachments'] as $row) {
            $measurement = collect($data['measurements'])->firstWhere('id', $row['measurement_id']);
            $matches = $measurement && DB::table('customer_measurements')->where('id', $measurement['id'])->where('request_id', $measurement['request_id'])->exists()
                && DB::table('fitting_attachments')->where('id', $row['id'])->where('path', $row['path'])->where('measurement_id', $row['measurement_id'])->exists();
            if ($matches && ! Storage::disk('fittings')->exists($row['path'])) {
                if (! Storage::disk('fittings')->put($row['path'], $files[$row['id']])) {
                    throw new RuntimeException('Unable to restore preview fitting media.');
                }
            }
        }
        $this->info($copied ? 'Customer snapshot copied.' : 'Existing customer records left unchanged.');

        return self::SUCCESS;
    }
}
