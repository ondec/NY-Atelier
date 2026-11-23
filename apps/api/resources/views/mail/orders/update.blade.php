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

<x-mail::note>Open the NY Atelier app to see your order, its progress and the full timeline.</x-mail::note>

<x-mail::signature />
</x-mail::message>
