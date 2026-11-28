<x-mail::message>
<x-mail::kicker>Appointment</x-mail::kicker>

@if ($kind === 'confirmed')
# Your appointment is confirmed

{{ $name ? "Hello {$name}, we" : 'We' }} look forward to seeing you.

<x-mail::panel>
**{{ $purpose }}** · {{ $meeting }}

{{ $when }} (Accra time)
</x-mail::panel>

<x-mail::button :url="$link">
View appointment
</x-mail::button>
@else
# Please choose a time

{{ $name ? "Hello {$name}, your" : 'Your' }} requested time for **{{ $purpose }}** isn’t free. These times are:

@foreach ($options as $option)
- {{ $option }}
@endforeach

<x-mail::button :url="$link">
Choose a time
</x-mail::button>

If none of them suit you, open the link and tell us; the team will find another time.
@endif

<x-mail::note>Questions? Reply to this email.</x-mail::note>

<x-mail::signature />
</x-mail::message>
