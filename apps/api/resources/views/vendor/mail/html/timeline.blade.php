{{-- Order progress: done stages ticked with their date, the current stage highlighted, later stages greyed. --}}
@props(['steps'])
<table class="timeline" width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td class="timeline-title" colspan="2">Your order so far</td></tr>
@foreach ($steps as $step)
<tr class="timeline-row timeline-{{ $step['state'] }}">
<td class="timeline-mark" width="34"><span class="timeline-dot">@if ($step['state'] === 'done')&#10003;@elseif ($step['state'] === 'current')&#9679;@elseif ($step['state'] === 'skipped')&#8211;@else&nbsp;@endif</span></td>
<td class="timeline-text"><span class="timeline-label">{{ $step['label'] }}</span>@if ($step['state'] === 'current')<span class="timeline-now">Now</span>@endif
@if ($step['date'] || $step['note'])<br><span class="timeline-date">{{ $step['note'] ?? $step['date'] }}</span>@endif</td>
</tr>
@endforeach
</table>
