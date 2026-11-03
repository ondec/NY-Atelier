<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderEvent extends Model
{
    protected $fillable = [
        'order_id', 'order_item_id', 'title', 'explanation',
        'occurred_at', 'client_visible',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'client_visible' => 'boolean',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
