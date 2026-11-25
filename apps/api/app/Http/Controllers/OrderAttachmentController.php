<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\OrderInspiration;
use App\StaffAccess;
use App\StoredMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class OrderAttachmentController extends Controller
{
    public function store(Request $request, string $reference): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        abort_unless(OrderInspiration::canChange($user, $order), 403, 'You can’t add inspiration to this order.');
        $request->validate(['attachments' => ['required', 'array', 'list', 'min:1', 'max:6'], 'attachments.*' => StoredMedia::rules()]);
        $files = $request->file('attachments');
        if (array_sum(array_map(fn ($file): int => $file->getSize(), $files)) > 60 * 1024 * 1024) {
            throw ValidationException::withMessages(['attachments' => 'Keep the photos and videos under 60 MB in total.']);
        }

        $paths = [];
        try {
            DB::transaction(function () use ($order, $files, &$paths): void {
                Order::query()->whereKey($order->id)->lockForUpdate()->first();
                if (DB::table('order_attachments')->where('order_id', $order->id)->count() + count($files) > OrderInspiration::MAX_FILES) {
                    throw ValidationException::withMessages(['attachments' => 'An order can have up to '.OrderInspiration::MAX_FILES.' photos and videos.']);
                }
                foreach ($files as $file) {
                    $record = StoredMedia::store($file, "orders/{$order->id}");
                    $paths[] = $record['path'];
                    DB::table('order_attachments')->insert([...$record, 'order_id' => $order->id, 'created_at' => now(), 'updated_at' => now()]);
                }
            });
        } catch (\Throwable $exception) {
            Storage::disk('fittings')->delete($paths);
            throw $exception;
        }

        return response()->json(['attachments' => DB::table('order_attachments')->where('order_id', $order->id)->orderBy('created_at')->orderBy('name')->get(['id', 'name', 'mime_type', 'size'])], 201);
    }

    public function show(Request $request, string $reference, string $attachment): Response
    {
        $user = StaffAccess::requireStaffToken($request);
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        abort_unless(OrderInspiration::canView($user, $order), 404);
        $file = DB::table('order_attachments')->where('order_id', $order->id)->where('id', $attachment)->first(['path', 'mime_type']);
        abort_unless($file, 404);

        return StoredMedia::respond($request, $file->path, $file->mime_type);
    }

    public function destroy(Request $request, string $reference, string $attachment): JsonResponse
    {
        $user = StaffAccess::requireStaffToken($request);
        $order = Order::query()->where('reference', $reference)->firstOrFail();
        abort_unless(OrderInspiration::canChange($user, $order), 403, 'You can’t remove inspiration from this order.');
        $file = DB::table('order_attachments')->where('order_id', $order->id)->where('id', $attachment)->first();
        abort_unless($file, 404);
        DB::table('order_attachments')->where('id', $file->id)->delete();
        // A fitting shared by several orders shares the same stored file, so it is only deleted when unused.
        if (! DB::table('order_attachments')->where('path', $file->path)->exists() && ! DB::table('fitting_attachments')->where('path', $file->path)->exists()) {
            Storage::disk('fittings')->delete($file->path);
        }

        return response()->json(['deleted' => true]);
    }
}
