<x-mail::message>
# Your NY Atelier order

**Order {{ $reference }}**

{{ $update }}

@if ($instructions)
## Handover information

{{ $instructions }}
@endif

Open your NY Atelier app to view the order, its progress and the full timeline.

NY Atelier
</x-mail::message>
