<?php

namespace App\Providers;

use App\Models\Customer;
use App\Models\User;
use App\StaffAccess;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Passkeys\Passkeys;

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

        // Customer tokens are also Sanctum tokens; only staff users can pass staff gates.
        Gate::define('staff.owner-overview', fn ($user): bool => $user instanceof User && StaffAccess::allows($user, 'office') && $user->staff_role === 'owner');
        foreach (array_unique(array_merge(...array_values(StaffAccess::PERMISSIONS))) as $permission) {
            Gate::define('staff.'.$permission, fn ($user): bool => $user instanceof User && StaffAccess::allows($user, $permission));
        }
    }
}
