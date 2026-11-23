<?php

namespace App\Console\Commands;

use App\WordPressCatalogueImport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class ImportWordPressCatalogue extends Command
{
    protected $signature = 'catalogue:import-wordpress {csv} {snapshot} {--apply} {--revision=} {--backup=} {--report=}';

    protected $description = 'Preview or apply the reviewed RTW WordPress product export to the local catalogue';

    public function handle(WordPressCatalogueImport $importer): int
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->error('This import command is local-only. Hosted catalogue changes need a separately approved deployment workflow.');

            return self::FAILURE;
        }
        try {
            $rows = $importer->readCsv($this->argument('csv'));
            $path = $this->argument('snapshot');
            if (! is_file($path) || filesize($path) > 10 * 1024 * 1024) {
                throw new RuntimeException('Use a published product snapshot under 10 MB.');
            }
            $snapshot = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            $result = DB::transaction(function () use ($importer, $rows, $snapshot): array {
                $row = DB::table('studio_catalogues')->where('id', 1)->lockForUpdate()->first();
                if (! $row) {
                    throw new RuntimeException('Initialize the local catalogue before importing.');
                }
                $before = json_decode($row->payload, true, 512, JSON_THROW_ON_ERROR);
                $prepared = $importer->prepare($rows, $snapshot, $before);
                $prepared['report']['revision_before'] = (int) $row->revision;
                $prepared['report']['applied'] = false;
                if ($this->option('apply') && json_encode($prepared['catalogue']) !== json_encode($before)) {
                    if ((string) $this->option('revision') !== (string) $row->revision) {
                        throw new RuntimeException('Catalogue revision changed. Preview again and pass --revision='.$row->revision.'.');
                    }
                    $backup = $this->option('backup');
                    if (! $backup || file_exists($backup)) {
                        throw new RuntimeException('Choose a new private --backup path before applying.');
                    }
                    $stream = fopen($backup, 'x');
                    if (! $stream) {
                        throw new RuntimeException('Cannot create the catalogue backup.');
                    }
                    chmod($backup, 0600);
                    $backupData = json_encode(['revision' => $row->revision, 'payload' => $before], JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
                    if (fwrite($stream, $backupData) !== strlen($backupData)) {
                        fclose($stream);
                        throw new RuntimeException('The complete catalogue backup could not be written; import cancelled.');
                    }
                    fclose($stream);
                    DB::table('studio_catalogues')->where('id', 1)->update(['payload' => json_encode($prepared['catalogue'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), 'revision' => $row->revision + 1, 'updated_at' => now()]);
                    $prepared['report']['applied'] = true;
                }

                return $prepared['report'];
            }, 3);
            $encoded = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if ($this->option('report')) {
                file_put_contents($this->option('report'), $encoded."\n");
            }
            $this->line($encoded);

            return self::SUCCESS;
        } catch (Throwable $failure) {
            $this->error($failure->getMessage());

            return self::FAILURE;
        }
    }
}
