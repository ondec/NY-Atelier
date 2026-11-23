<x-mail::layout>
{{-- Header: NY mark, name and tagline from config('mail.brand') --}}
<x-slot:header>
<x-mail::header :url="config('mail.brand.website')" />
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
<span class="footer-brand">{{ \Illuminate\Support\Str::upper(config('mail.brand.name')) }}</span>

@foreach (config('mail.brand.footer_lines', []) as $line)
{{ $line }}<br>
@endforeach
[{{ preg_replace('#^https?://#', '', config('mail.brand.website')) }}]({{ config('mail.brand.website') }})

© {{ date('Y') }} {{ config('mail.brand.name') }}
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
