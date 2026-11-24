<?php

namespace App\Http\Controllers;

use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Size charts published from NY Office. The portal validates each chart in detail
 * (shared TypeScript rules); this stores the publication and guards its revision.
 */
class SizeChartController extends Controller
{
    private const MAX_BYTES = 2 * 1024 * 1024;

    /** Public: the published charts, with each collection default's current garments. */
    public function show(): JsonResponse
    {
        $publication = $this->current();
        $catalogue = json_decode(DB::table('studio_catalogues')->where('id', 1)->value('payload') ?? '{}', true);
        $products = collect($catalogue['collections'] ?? [])->mapWithKeys(fn (array $row): array => [
            (string) ($row['id'] ?? '') => array_values(array_map(fn ($id): string => preg_replace('/^shop-/', '', (string) $id), $row['productIds'] ?? [])),
        ]);
        foreach ($publication->collections as $key => $assignment) {
            $collectionId = preg_replace('/:(men|women)$/', '', (string) $key);
            if ($products->has($collectionId) && is_object($assignment)) {
                $assignment->productIds = $products->get($collectionId);
            }
        }

        return response()->json($publication)->header('Cache-Control', 'no-store');
    }

    /** Staff: replace the publication when the expected revision still matches. */
    public function update(Request $request): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $request->validate([
            'revision' => ['required', 'integer', 'min:0'],
            'publication' => ['required', 'array'],
            'publication.version' => ['required', 'in:1.0'],
            'publication.revision' => ['required', 'integer', 'min:0'],
            'publication.charts' => ['present', 'array', 'list', 'max:2000'],
            'publication.products' => ['present', 'array', 'max:20000'],
            'publication.collections' => ['present', 'array', 'max:2000'],
        ]);
        // Decode again as objects so empty maps stay {} (the shared validator requires objects).
        $publication = json_decode($request->getContent())->publication ?? null;
        if (! is_object($publication) || ! is_object($publication->products) || ! is_object($publication->collections)) {
            throw ValidationException::withMessages(['publication' => 'Products and collections must be objects.']);
        }
        if (strlen($request->getContent()) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['publication' => 'The size charts are too large to save.']);
        }

        $saved = DB::transaction(function () use ($request, $publication): object {
            $row = DB::table('size_chart_publications')->where('id', 1)->lockForUpdate()->first();
            $stored = (int) ($row->revision ?? 0);
            abort_unless((int) $request->integer('revision') === $stored, 409, 'Charts have changed in another window. Reload the charts before saving.');
            // Never go backwards, so charts carried over from the old file keep a newer revision.
            $publication->revision = max($stored, (int) $publication->revision) + 1;
            DB::table('size_chart_publications')->updateOrInsert(['id' => 1], [
                'payload' => json_encode($publication, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'revision' => $publication->revision,
                'created_at' => $row->created_at ?? now(),
                'updated_at' => now(),
            ]);

            return $publication;
        });

        return response()->json($saved);
    }

    private function current(): object
    {
        $payload = DB::table('size_chart_publications')->where('id', 1)->value('payload');
        $publication = $payload ? json_decode($payload) : null;

        return is_object($publication) ? $publication : (object) [
            'version' => '1.0', 'revision' => 0, 'charts' => [], 'products' => new \stdClass, 'collections' => new \stdClass,
        ];
    }
}
