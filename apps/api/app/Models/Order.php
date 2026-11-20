<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'customer_id', 'reference', 'category', 'status', 'source',
        'expected_completion_date', 'date_change_explanation',
        'fulfilment_method', 'fulfilment_status', 'payment_status',
        'workflow_stage', 'workflow_version', 'handover_instructions', 'courier_name', 'tracking_reference',
        'client_action', 'completed_at', 'service_offering', 'consultation_id', 'measurement_id',
    ];

    protected function casts(): array
    {
        return [
            'expected_completion_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'workflow_version' => 'integer',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('sort_order');
    }

    public function events(): HasMany
    {
        return $this->hasMany(OrderEvent::class)->orderByDesc('occurred_at')->orderByDesc('id');
    }
}
