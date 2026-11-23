{{-- Closing line, defaults to the brand name --}}
<p class="signature">{{ trim($slot) !== '' ? $slot : 'With care, '.config('mail.brand.name') }}</p>
