<?php

namespace App\Providers;

use App\Mail\MicrosoftGraphTransport;
use App\Models\Customer;
use App\Models\User;
use App\StaffAccess;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Laravel\Passkeys\Passkeys;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Customer passkeys use our own token routes in routes/api.php, not the package's session routes.
        Passkeys::ignoreRoutes();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Passkeys belong to customers. Staff keep signing in with passwords.
        Passkeys::useUserModel(Customer::class);

        // Microsoft 365 mail over HTTPS. Credentials come only from the environment.
        Mail::extend('microsoft-graph', function (array $config): MicrosoftGraphTransport {
            foreach (['tenant_id', 'client_id', 'client_secret', 'sender'] as $key) {
                if (! filled($config[$key] ?? null)) {
                    throw new RuntimeException('Microsoft Graph mail is not fully configured.');
                }
            }

            return new MicrosoftGraphTransport($config['tenant_id'], $config['client_id'], $config['client_secret'], $config['sender']);
        });

        // Customer tokens are also Sanctum tokens; only staff users can pass staff gates.
        // The owner overview (takings, salaries and business totals) is for the owner and general manager.
        Gate::define('staff.owner-overview', fn ($user): bool => $user instanceof User && StaffAccess::allows($user, 'office') && in_array($user->staff_role, ['owner', 'manager'], true));
        // The staff API that NY Office and NY Studio share; each route also checks its own permission.
        Gate::define('staff.catalogue', fn ($user): bool => $user instanceof User && (StaffAccess::allows($user, 'sales') || StaffAccess::allows($user, 'catalogue.manage')));
        Gate::define('staff.desk', fn ($user): bool => $user instanceof User && (StaffAccess::allows($user, 'office') || StaffAccess::allows($user, 'studio')));
        foreach (array_unique(array_merge(...array_values(StaffAccess::PERMISSIONS))) as $permission) {
            Gate::define('staff.'.$permission, fn ($user): bool => $user instanceof User && StaffAccess::allows($user, $permission));
        }
    }
}
