<?php

use App\Mail\CustomerSignInAlertMail;
use App\Mail\CustomerSignInCodeMail;
use App\Mail\OrderUpdateMail;
use App\Mail\StaffInvitationMail;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Markdown;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/*
 * Email design previews, available only when APP_ENV=local. Nothing is sent.
 * Open http://127.0.0.1:8000/dev/mail and refresh after editing a template or the theme.
 */
if (app()->environment('local')) {
    $samples = fn (): array => [
        'staff-invitation' => ['Staff invitation', fn () => new StaffInvitationMail('Ben', 'Customer records', 'https://example.test/staff/activate#token=preview', now()->addHours(72))],
        'customer-sign-in' => ['Customer sign-in code', fn () => new CustomerSignInCodeMail('482913', 'https://example.test/sign-in', 10)],
        'customer-sign-in-alert' => ['Customer sign-in alert', fn () => new CustomerSignInAlertMail('SMS')],
        'order-update' => ['Order update', fn () => new OrderUpdateMail('NY-1042', 'Your agbada is ready for collection at the studio.', 'Bring your order reference. Collection hours are Monday to Saturday, 10:00–18:00.')],
        'password-reset' => ['Password reset (example, not sent yet)', fn () => app(Markdown::class)->render('mail.examples.password-reset', ['email' => 'ben@example.test', 'url' => 'https://example.test/reset', 'minutes' => 60])],
    ];

    Route::get('/dev/mail', function () use ($samples) {
        $links = collect($samples())->map(fn (array $sample, string $key): string => '<li><a href="/dev/mail/'.$key.'">'.e($sample[0]).'</a> · <a href="/dev/mail/'.$key.'?text=1">plain text</a></li>')->implode('');

        return response('<!doctype html><meta charset="utf-8"><title>NY email previews</title><body style="font-family:system-ui;padding:32px;background:#F6F3EC;color:#123C45"><h1>NY Atelier email previews</h1><p>Local only. Nothing is sent.</p><ul style="line-height:2">'.$links.'</ul></body>');
    });

    Route::get('/dev/mail/{template}', function (string $template) use ($samples) {
        $sample = $samples()[$template] ?? abort(404);
        $mail = $sample[1]();
        if (request()->boolean('text')) {
            $text = $mail instanceof Mailable ? app(Markdown::class)->renderText($mail->content()->markdown, $mail->buildViewData()) : strip_tags((string) $mail);

            return response('<pre style="white-space:pre-wrap;font:14px/1.6 ui-monospace;padding:24px">'.e($text).'</pre>');
        }

        return $mail instanceof Mailable ? $mail->render() : $mail;
    })->where('template', '[a-z-]+');
}
