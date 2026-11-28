<?php

namespace App;

use App\Mail\AppointmentMail;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Emails the customer when the team confirms an appointment or suggests other times.
 * Works for website guests (contact email) and account customers alike. The email links to the
 * website's reply page with a private token, so nobody needs to sign in to answer.
 */
class ConsultationNotice
{
    /** The private token in the reply link. Tied to the request id; the request's status decides what it can do. */
    public static function token(string $id): string
    {
        return hash_hmac('sha256', 'consultation-reply|'.$id, (string) config('app.key'));
    }

    public static function validToken(string $id, string $token): bool
    {
        return hash_equals(self::token($id), $token);
    }

    public static function link(string $id): string
    {
        return config('customer_auth.website_url').'/appointment/reply?'.http_build_query(['id' => $id, 'token' => self::token($id)]);
    }

    public static function readable(string $date, string $time): string
    {
        return CarbonImmutable::parse("$date $time", 'Africa/Accra')->format('l j F · H:i');
    }

    /** kind: confirmed | options. Never blocks the staff action: a failed email is reported, not thrown. */
    public function send(string $id, string $kind): void
    {
        $row = DB::table('consultations')->leftJoin('customers', 'customers.id', '=', 'consultations.customer_id')
            ->where('consultations.id', $id)
            ->select('consultations.*')
            ->selectRaw('COALESCE(customers.email, consultations.contact_email) as email')
            ->selectRaw('COALESCE(customers.name, consultations.contact_name) as name')
            ->first();
        if (! $row || ! filter_var($row->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }
        $options = $kind === 'options' ? array_map(fn (array $option): string => self::readable($option['date'], $option['time']), json_decode((string) $row->options, true) ?: []) : [];
        $first = trim(explode(' ', (string) $row->name)[0] ?? '');
        try {
            Mail::to($row->email)->send(new AppointmentMail(
                $kind,
                $first !== '' && $first !== 'New' ? $first : null,
                $row->purpose,
                $row->method === 'virtual' ? 'Video call' : 'In person',
                $kind === 'confirmed' ? self::readable($row->confirmedDate, $row->confirmedTime) : null,
                $options,
                self::link($row->id),
            ));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
