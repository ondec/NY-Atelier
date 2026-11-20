<?php

namespace App;

use Illuminate\Support\Facades\Log;
use RuntimeException;

class CustomerSms
{
    /** @var list<array{to: string, message: string}> Messages kept by the array driver (tests). */
    public static array $sent = [];

    public function send(string $phone, string $message): void
    {
        match (config('customer_auth.sms_driver')) {
            'log' => Log::info('Customer SMS (not delivered, log driver)', ['to' => $phone, 'message' => $message]),
            'array' => self::$sent[] = ['to' => $phone, 'message' => $message],
            default => throw new RuntimeException('No SMS provider is configured.'),
        };
    }
}
