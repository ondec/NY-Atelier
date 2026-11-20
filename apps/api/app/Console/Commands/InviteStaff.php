<?php

namespace App\Console\Commands;

use App\Models\User;
use App\StaffAccess;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class InviteStaff extends Command
{
    protected $signature = 'staff:invite {email} {role} {--name=} {--portal=http://127.0.0.1:3000} {--password-file=}';

    protected $description = 'Prepare a named staff account and print a one-use password setup link';

    public function handle(): int
    {
        $email = Str::lower(trim($this->argument('email')));
        $role = $this->argument('role');
        $portal = rtrim($this->option('portal'), '/');
        if (Validator::make(['email' => $email, 'portal' => $portal], ['email' => 'required|email|max:255', 'portal' => 'required|url:http,https'])->fails() || ! isset(StaffAccess::PERMISSIONS[$role])) {
            $this->error('Provide a valid email, portal URL and role: owner, manager or receptionist.');

            return self::FAILURE;
        }
        $password = $this->option('password-file') ? trim(file_get_contents($this->option('password-file'))) : null;
        if ($password !== null && mb_strlen($password) < 12) {
            $this->error('The preview password must be at least 12 characters.');

            return self::FAILURE;
        }
        $token = bin2hex(random_bytes(32));
        $result = DB::transaction(function () use ($email, $role, $token, $password): bool {
            $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
            if ($user && ($user->staff_active || $user->staff_role !== $role)) {
                return false;
            }
            $user ??= new User(['email' => $email, 'name' => $this->option('name') ?: 'NY '.ucfirst($role), 'password' => Str::random(64)]);
            $user->staff_role = $role;
            $user->staff_active = $password !== null;
            if ($password !== null) {
                $user->password = $password;
            }
            $user->save();
            DB::table('staff_members')->updateOrInsert(['user_id' => $user->id], ['name' => $user->name, 'job_title' => ucfirst($role), 'salary_eligible' => false, 'sort_order' => 100 + array_search($role, array_keys(StaffAccess::PERMISSIONS), true), 'created_at' => now(), 'updated_at' => now()]);
            if ($password === null) {
                DB::table('staff_activation_tokens')->updateOrInsert(['user_id' => $user->id], ['hash' => hash('sha256', $token), 'expires_at' => now()->addDay()]);
            } else {
                DB::table('staff_activation_tokens')->where('user_id', $user->id)->delete();
                $user->tokens()->delete();
            }

            return true;
        }, 3);
        if (! $result) {
            $this->error('An active account or another account type already uses that email. No access was changed.');

            return self::FAILURE;
        }
        if ($password !== null) {
            $this->info('Preview staff account created.');

            return self::SUCCESS;
        }
        $this->line($portal.'/staff/activate#token='.$token);
        $this->info('One use, valid for 24 hours. The staff member must choose their own password.');

        return self::SUCCESS;
    }
}
