<?php

namespace App;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Fitting and order inspiration files on the private "fittings" disk (local, or the R2 bucket when hosted). */
class StoredMedia
{
    /** @return list<string> */
    public static function rules(): array
    {
        return ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm', 'max:20480'];
    }

    /** Saves an uploaded file under the given folder and returns its record fields. */
    public static function store(UploadedFile $file, string $folder): array
    {
        $id = (string) Str::uuid();
        $path = $file->storeAs($folder, $id.'.'.$file->guessExtension(), 'fittings');

        return ['id' => $id, 'path' => $path, 'name' => Str::limit(basename($file->getClientOriginalName()), 175, ''),
            'mime_type' => $file->getMimeType(), 'size' => $file->getSize()];
    }

    public static function respond(Request $request, string $path, string $mimeType): Response
    {
        $disk = Storage::disk('fittings');
        abort_unless($disk->exists($path), 404);
        $headers = ['Content-Type' => $mimeType, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff', 'Content-Disposition' => 'inline'];

        if (config('filesystems.disks.fittings.driver') !== 's3') {
            return response()->file($disk->path($path), $headers);
        }

        return self::streamFromBucket($request, $disk->temporaryUrl($path, now()->addMinutes(5)), $headers);
    }

    /**
     * Relays a file from the private R2 bucket through the API, passing on byte-range requests so videos can seek
     * (iPhone and iPad Safari require this). Staff never receive a bucket link.
     *
     * @param  array<string, string>  $headers
     */
    private static function streamFromBucket(Request $request, string $signedUrl, array $headers): StreamedResponse
    {
        $range = $request->header('Range');
        $upstream = Http::withHeaders($range ? ['Range' => $range] : [])->withOptions(['stream' => true])->timeout(60)->get($signedUrl);
        abort_unless(in_array($upstream->status(), [200, 206, 416], true), $upstream->status() === 404 ? 404 : 502);
        foreach (['Content-Length', 'Content-Range'] as $name) {
            if ($upstream->header($name) !== '') {
                $headers[$name] = $upstream->header($name);
            }
        }
        $body = $upstream->toPsrResponse()->getBody();

        return response()->stream(function () use ($body): void {
            while (! $body->eof()) {
                echo $body->read(65536);
                flush();
            }
        }, $upstream->status(), $headers + ['Accept-Ranges' => 'bytes']);
    }
}
