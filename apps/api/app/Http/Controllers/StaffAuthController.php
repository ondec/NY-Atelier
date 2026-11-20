<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\StaffAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class StaffAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:255'], 'password' => ['required', 'string', 'max:255']]);
        $key = 'staff-login:'.hash('sha256', Str::lower($data['email']).'|'.$request->ip());
        abort_if(RateLimiter::tooManyAttempts($key, 5), 429, 'Too many sign-in attempts. Please try again in a minute.');
        RateLimiter::hit($key, 60);
        $user = User::query()->whereRaw('LOWER(email) = ?', [Str::lower($data['email'])])->first();
        if (! $user || ! $user->staff_active || ! isset(StaffAccess::PERMISSIONS[$user->staff_role]) || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'The email or password is incorrect, or staff access is unavailable.'], 401);
        }
        RateLimiter::clear($key);
        $request->user('sanctum')?->currentAccessToken()?->delete();

        return $this->signedIn($user);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['staff' => StaffAccess::profile($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['signedOut' => true]);
    }

    public function activation(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/']]);
        $row = DB::table('staff_activation_tokens')->where('hash', hash('sha256', $data['token']))->where('expires_at', '>', now())->first();
        abort_unless($row, 422, 'This account setup link is invalid or expired. Ask for a new one.');
        $user = User::query()->findOrFail($row->user_id);
        abort_unless(isset(StaffAccess::PERMISSIONS[$user->staff_role]) && ! $user->staff_active, 422, 'This setup link is no longer available.');

        return response()->json(['name' => $user->name, 'email' => $user->email, 'role' => $user->staff_role]);
    }

    public function activate(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'regex:/^[a-f0-9]{64}$/'], 'password' => ['required', 'confirmed', 'string', 'max:255', Password::min(12)->letters()->numbers()]]);
        $user = DB::transaction(function () use ($data): User {
            $row = DB::table('staff_activation_tokens')->where('hash', hash('sha256', $data['token']))->lockForUpdate()->first();
            abort_unless($row && $row->expires_at > now()->toDateTimeString(), 422, 'This account setup link is invalid or expired. Ask for a new one.');
            $user = User::query()->lockForUpdate()->findOrFail($row->user_id);
            abort_unless(isset(StaffAccess::PERMISSIONS[$user->staff_role]) && ! $user->staff_active, 422, 'This setup link is no longer available.');
            $user->password = $data['password'];
            $user->staff_active = true;
            $user->email_verified_at = now();
            $user->save();
            $user->tokens()->delete();
            DB::table('staff_activation_tokens')->where('hash', $row->hash)->delete();

            return $user;
        }, 3);

        return $this->signedIn($user);
    }

    private function signedIn(User $user): JsonResponse
    {
        $token = $user->createToken('NY staff session', ['staff'], now()->addHours(8));

        return response()->json(['token' => $token->plainTextToken, 'staff' => StaffAccess::profile($user), 'expiresIn' => 28800])->header('Cache-Control', 'no-store');
    }
}
