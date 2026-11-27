<x-mail::message>
<x-mail::kicker>Order {{ $reference }}</x-mail::kicker>

# An update on your order

{{ $update }}

@if ($instructions)
<x-mail::panel>
**Handover information**

{{ $instructions }}
</x-mail::panel>
@endif

@if ($timeline)
<x-mail::timeline :steps="$timeline" />
@endif

<x-mail::note>Open the NY Atelier app to see your order and its progress at any time.</x-mail::note>

<x-mail::signature />
</x-mail::message>
