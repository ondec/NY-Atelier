<?php

namespace App\Models;

use App\CustomerSignIn;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Access\Authorizable as AuthorizableContract;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\Access\Authorizable;
use Laravel\Passkeys\Contracts\PasskeyUser;
use Laravel\Passkeys\PasskeyAuthenticatable;
use Laravel\Passkeys\Passkeys;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Model implements AuthenticatableContract, AuthorizableContract, PasskeyUser
{
    use Authenticatable, Authorizable, HasApiTokens, PasskeyAuthenticatable;

    protected $fillable = ['name', 'email', 'phone', 'account_reference'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'first_signed_in_at' => 'datetime',
            'last_signed_in_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Customer $customer) {
            if ($customer->isDirty('phone')) {
                $customer->phone_e164 = CustomerSignIn::normalizePhone($customer->phone);
            }
        });
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /** The package's passkeys table keys the owner as user_id, so the guessed customer_id must be overridden. */
    public function passkeys(): HasMany
    {
        return $this->hasMany(Passkeys::passkeyModel(), 'user_id');
    }

    /** Shown in the phone's passkey prompts and password manager. */
    public function getPasskeyDisplayName(): string
    {
        return collect([$this->name, $this->email, $this->phone])->first(fn ($value) => filled($value)) ?? 'NY Atelier customer';
    }

    public function getPasskeyUsername(): string
    {
        return collect([$this->email, $this->phone])->first(fn ($value) => filled($value)) ?? 'customer-'.$this->getKey();
    }

    /** Customers do not have passwords; sign-in uses one-time codes and passkeys. */
    public function getAuthPassword(): string
    {
        return '';
    }

    public function getRememberTokenName(): string
    {
        return '';
    }
}
