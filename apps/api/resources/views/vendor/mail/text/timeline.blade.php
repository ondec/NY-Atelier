@props(['steps'])
Your order so far:
@foreach ($steps as $step)
{{ match ($step['state']) { 'done' => '[x]', 'current' => '[>]', 'skipped' => '[-]', default => '[ ]' } }} {{ $step['label'] }}{{ $step['state'] === 'current' ? ' (now)' : '' }}{{ ($step['note'] ?? $step['date']) ? ' · '.($step['note'] ?? $step['date']) : '' }}
@endforeach
