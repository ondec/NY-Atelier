@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
<img src="{{ config('mail.brand.logo_url') }}" class="logo" width="64" height="64" alt="">
<span class="brand-name">{{ \Illuminate\Support\Str::upper(config('mail.brand.name')) }}</span>
<span class="brand-tagline">{{ \Illuminate\Support\Str::upper(config('mail.brand.tagline')) }}</span>
</a>
</td>
</tr>
