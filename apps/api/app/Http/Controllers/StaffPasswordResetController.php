<?php

namespace App\Http\Controllers;

use App\StaffPasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class StaffPasswordResetController extends Controller
{
    public function forgot(Request $request, StaffPasswordReset $resets): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'next' => ['sometimes', 'string', 'in:office,studio'],
        ]);
        $resets->request($data['email'], $data['next'] ?? 'office');

        return response()->json(['message' => StaffPasswordReset::REQUEST_MESSAGE])->header('Cache-Control', 'no-store');
    }

    public function reset(Request $request, StaffPasswordReset $resets): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/'],
            'password' => ['required', 'confirmed', 'string', 'max:255', Password::min(12)->letters()->numbers()],
        ]);
        if (! $resets->reset($data['email'], $data['token'], $data['password'])) {
            return response()->json(['message' => StaffPasswordReset::INVALID_MESSAGE], 422)->header('Cache-Control', 'no-store');
        }

        return response()->json(['message' => 'Your password has been reset. Sign in with your new password.'])->header('Cache-Control', 'no-store');
    }
}
