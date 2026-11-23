@props(['rows' => []])
{{-- Label/value rows, e.g. <x-mail::details :rows="['Order' => 'NY-1042', 'Status' => 'Ready']" /> --}}
<table class="details-table" width="100%" cellpadding="0" cellspacing="0" role="presentation">
@foreach ($rows as $label => $value)
<tr>
<td class="details-label">{{ $label }}</td>
<td class="details-value">{{ $value }}</td>
</tr>
@endforeach
</table>
