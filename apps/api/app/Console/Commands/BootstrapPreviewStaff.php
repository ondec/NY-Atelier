<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

#[Signature('staff:bootstrap-preview')]
#[Description('Create explicitly configured preview staff, without changing existing accounts')]
class BootstrapPreviewStaff extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (! config('preview.enabled')) {
            $this->error('Preview account setup is disabled.');

            return self::FAILURE;
        }

        $accounts = array_filter(config('preview.accounts', []));
        $password = config('preview.password');
        $emails = array_map(fn ($email) => is_string($email) ? Str::lower(trim($email)) : '', $accounts);
        $valid = Validator::make(['emails' => array_values($emails), 'password' => $password], [
            'emails' => ['required', 'array', 'min:1', 'max:3'],
            'emails.*' => ['required', 'email', 'max:255', 'distinct'],
            'password' => ['required', 'string', 'min:12'],
        ])->passes();
        if (! $valid || array_diff(array_keys($accounts), ['owner', 'manager', 'receptionist'])) {
            $this->error('Configure unique preview staff emails and a password of at least 12 characters.');

            return self::FAILURE;
        }

        $file = tempnam(sys_get_temp_dir(), 'ny-preview-');
        if ($file === false) {
            throw new RuntimeException('Unable to prepare preview account setup.');
        }
        try {
            chmod($file, 0600);
            file_put_contents($file, $password);
            DB::transaction(function () use ($emails, $file): void {
                foreach ($emails as $role => $email) {
                    // Redeploys must never reset passwords, reactivate people or grant another role.
                    if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
                        continue;
                    }
                    $result = $this->callSilent('staff:invite', [
                        'email' => $email,
                        'role' => $role,
                        '--password-file' => $file,
                    ]);
                    if ($result !== self::SUCCESS) {
                        throw new RuntimeException('Preview account setup failed. No accounts were changed.');
                    }
                }
            });
        } finally {
            unlink($file);
        }
        $this->info('Preview accounts checked. Existing accounts were left unchanged.');

        return self::SUCCESS;
    }
}
