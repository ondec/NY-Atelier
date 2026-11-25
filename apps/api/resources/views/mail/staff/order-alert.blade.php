<x-mail::message>
<x-mail::kicker>{{ $kicker }}</x-mail::kicker>

# {{ $heading }}

{{ $body }}

<x-mail::details :rows="$details" />

@foreach ($sections as $section)
## {{ $section['title'] }}

@if (! empty($section['text']))
<x-mail::panel>
{!! nl2br(e($section['text'])) !!}
</x-mail::panel>
@endif
@if (! empty($section['rows']))
<x-mail::details :rows="$section['rows']" />
@endif

@endforeach

<x-mail::button :url="$url">
{{ $buttonLabel }}
</x-mail::button>

<x-mail::signature />
</x-mail::message>
