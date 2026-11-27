<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'customer_id', 'reference', 'category', 'original_category', 'status', 'source',
        'expected_completion_date', 'date_change_explanation',
        'fulfilment_method', 'fulfilment_status', 'payment_status',
        'workflow_stage', 'workflow_version', 'handover_instructions', 'courier_name', 'tracking_reference',
        'delivery_recipient_name', 'delivery_phone', 'delivery_address', 'delivery_area', 'delivery_gps_code', 'delivery_directions', 'delivery_latitude', 'delivery_longitude',
        'specifications', 'assigned_tailor_id', 'assigned_at', 'assigned_courier_id', 'courier_assigned_at', 'delivery_zone_id', 'delivery_due_from', 'delivery_due_by', 'created_by_id',
        'sent_to_production_at', 'sent_to_production_by_id', 'returned_from_production_at', 'production_return_reason',
        'client_action', 'completed_at', 'service_offering', 'consultation_id', 'measurement_id',
    ];

    protected function casts(): array
    {
        return [
            'expected_completion_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'assigned_at' => 'datetime',
            'courier_assigned_at' => 'datetime',
            'delivery_due_from' => 'date',
            'delivery_due_by' => 'date',
            'sent_to_production_at' => 'datetime',
            'returned_from_production_at' => 'datetime',
            'delivery_latitude' => 'float',
            'delivery_longitude' => 'float',
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

    /** The tailor making this order, chosen by the production manager. */
    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function assignedCourier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_courier_id');
    }

    public function assignedTailor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_tailor_id');
    }

    /** The staff member who sent the order to NY Production. */
    public function sentToProductionBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_to_production_by_id');
    }
}
