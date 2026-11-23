<?php

namespace App\Console\Commands;

use App\CatalogueTransfer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('catalogue:export-wordpress-transfer {path : New file to write; it must not exist yet}')]
#[Description('Write the imported WordPress products from this catalogue to a file an owner can import in NY Office')]
class ExportCatalogueTransfer extends Command
{
    public function handle(CatalogueTransfer $transfers): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->error('Export the transfer file from the local catalogue only.');

            return self::FAILURE;
        }
        $payload = DB::table('studio_catalogues')->where('id', 1)->value('payload');
        if (! $payload) {
            $this->error('There is no local catalogue to export.');

            return self::FAILURE;
        }
        $path = $this->argument('path');
        $stream = @fopen($path, 'x');
        if (! $stream) {
            $this->error('Choose a new file path; existing files are never overwritten.');

            return self::FAILURE;
        }
        chmod($path, 0600);
        $transfer = $transfers->export(json_decode($payload, true));
        fwrite($stream, json_encode($transfer, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");
        fclose($stream);
        $this->info(sprintf('Wrote %d products, %d sizes and %d photo sets to %s. Stock counts are not included.',
            count($transfer['products']), count($transfer['variants']), count($transfer['visuals']), $path));

        return self::SUCCESS;
    }
}
