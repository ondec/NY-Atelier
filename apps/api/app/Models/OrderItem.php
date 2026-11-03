<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'garment_name', 'wearer_name', 'status',
        'expected_completion_date', 'completed_at', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'expected_completion_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
