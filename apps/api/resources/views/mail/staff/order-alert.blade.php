<x-mail::message>
<x-mail::kicker>{{ $kicker }}</x-mail::kicker>

# {{ $heading }}

{{ $body }}

<x-mail::details :rows="$details" />

<x-mail::button :url="$url">
{{ $buttonLabel }}
</x-mail::button>

<x-mail::signature />
</x-mail::message>
