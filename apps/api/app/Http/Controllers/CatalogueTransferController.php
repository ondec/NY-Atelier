<?php

namespace App\Http\Controllers;

use App\CatalogueTransfer;
use App\StudioSales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Owner-only: add products from a WordPress catalogue transfer file to the shared catalogue, with undo. */
class CatalogueTransferController extends Controller
{
    private const REASON = 'wordpress-import';

    public function store(Request $request, CatalogueTransfer $transfers, StudioSales $sales): JsonResponse
    {
        $data = $request->validate(['transfer' => ['required', 'array'], 'apply' => ['required', 'boolean'], 'revision' => ['required_if_accepted:apply', 'integer', 'min:1']]);
        $result = DB::transaction(function () use ($data, $request, $transfers, $sales): array {
            $row = $sales->catalogue((bool) $data['apply']);
            abort_unless($row, 409, 'Open NY Office inventory once so the shared catalogue is set up, then import.');
            $before = json_decode($row->payload, true);
            $merged = $transfers->merge($before, $data['transfer']);
            if (! $data['apply']) {
                return ['summary' => $merged['summary'], 'revision' => (int) $row->revision];
            }
            abort_unless((int) $row->revision === (int) $data['revision'], 409, 'The catalogue changed while you were reviewing. Preview the import again.');
            abort_unless($merged['summary']['added_products'] || $merged['summary']['added_sizes'] || $merged['summary']['added_photo_sets'], 422, 'Nothing new to add. These products are already in the catalogue.');
            $backup = DB::table('studio_catalogue_backups')->insertGetId([
                'reason' => self::REASON, 'revision_before' => $row->revision, 'revision_after' => $row->revision + 1,
                'payload' => $row->payload, 'summary' => json_encode($merged['summary']), 'created_by' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('studio_catalogues')->where('id', 1)->update(['payload' => json_encode($merged['catalogue']), 'revision' => $row->revision + 1, 'updated_at' => now()]);

            return ['summary' => $merged['summary'], 'revision' => (int) $row->revision + 1, 'backup' => $backup];
        }, 3);

        return response()->json($result)->header('Cache-Control', 'no-store');
    }

    /** Puts the catalogue back as it was before an import, only if nothing has been saved since. */
    public function undo(int $backup, StudioSales $sales): JsonResponse
    {
        $revision = DB::transaction(function () use ($backup, $sales): int {
            $row = $sales->catalogue(true);
            $saved = DB::table('studio_catalogue_backups')->where('id', $backup)->where('reason', self::REASON)->lockForUpdate()->first();
            abort_unless($row && $saved, 404, 'This import cannot be found.');
            abort_if($saved->restored_at, 409, 'This import has already been undone.');
            abort_unless((int) $row->revision === (int) $saved->revision_after, 409, 'The catalogue has changed since this import, so it can no longer be undone automatically.');
            DB::table('studio_catalogues')->where('id', 1)->update(['payload' => $saved->payload, 'revision' => $row->revision + 1, 'updated_at' => now()]);
            DB::table('studio_catalogue_backups')->where('id', $backup)->update(['restored_at' => now(), 'updated_at' => now()]);

            return (int) $row->revision + 1;
        }, 3);

        return response()->json(['revision' => $revision])->header('Cache-Control', 'no-store');
    }
}
