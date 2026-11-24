<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PublicConsultationController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'uuid'],
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:40'],
            'method' => ['required', 'in:in-person,virtual'],
            'purpose' => ['required', 'string', 'max:150'],
            'preferredDate' => ['required', 'date_format:Y-m-d'],
            'preferredTime' => ['required', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $requestedAt = $data['preferredDate'].' '.$data['preferredTime'];
        if ($requestedAt <= now('Africa/Accra')->format('Y-m-d H:i')) {
            throw ValidationException::withMessages(['preferredDate' => 'Choose a future time in Accra.']);
        }

        $fields = [
            'source' => 'website',
            'contact_name' => trim($data['name']),
            'contact_email' => trim($data['email']),
            'contact_phone' => trim($data['phone']),
            'method' => $data['method'],
            'purpose' => trim($data['purpose']),
            'preferredDate' => $data['preferredDate'],
            'preferredTime' => $data['preferredTime'],
            'notes' => trim($data['notes'] ?? '') ?: null,
        ];

        $inserted = DB::table('consultations')->insertOrIgnore([
            'id' => $data['id'], ...$fields,
            'status' => 'awaiting-confirmation',
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted === 0) {
            $existing = DB::table('consultations')->where('id', $data['id'])->first();
            if (! $existing || collect($fields)->contains(fn ($value, $key): bool => $existing->{$key} !== $value)) {
                abort(409, 'This request could not be submitted. Refresh and try again.');
            }
        }

        return response()->json(['id' => $data['id'], 'status' => 'received'], $inserted ? 201 : 200);
    }
}
