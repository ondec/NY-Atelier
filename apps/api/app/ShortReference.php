<?php

namespace App;

use App\Models\Order;

/**
 * Short order codes such as CUS-4K7P: a type, then 4 random characters.
 *
 * Letters and numbers that look alike (0/O, 1/I/L) are left out, so a code is easy to read out and type:
 * 31 characters give about 920,000 codes per type. A code is checked before use, and after a run of
 * clashes it grows to 5 characters (about 28 million), so it never runs out. Duplicate taps are caught by
 * the request id kept with the order, not by the code.
 */
final class ShortReference
{
    public const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    public const PREFIXES = ['Custom' => 'CUS', 'Alterations' => 'ALT', 'Ready-to-Wear' => 'RTW'];

    public static function forOrder(string $category): string
    {
        $prefix = self::PREFIXES[$category] ?? 'ORD';
        for ($attempt = 0; $attempt < 40; $attempt++) {
            $code = $prefix.'-'.self::random($attempt < 20 ? 4 : 5);
            if (! Order::query()->where('reference', $code)->exists()) {
                return $code;
            }
        }

        return $prefix.'-'.self::random(8);
    }

    public static function random(int $length): string
    {
        $last = strlen(self::ALPHABET) - 1;

        return implode('', array_map(fn () => self::ALPHABET[random_int(0, $last)], range(1, $length)));
    }
}
