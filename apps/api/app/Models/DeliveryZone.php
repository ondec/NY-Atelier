<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A delivery area and the window (in days) promised to customers there. */
class DeliveryZone extends Model
{
    protected $fillable = ['name', 'min_days', 'max_days', 'sort_order', 'active'];

    protected function casts(): array
    {
        return ['min_days' => 'integer', 'max_days' => 'integer', 'sort_order' => 'integer', 'active' => 'boolean'];
    }

    /** @return array{id: int, name: string, min_days: int, max_days: int, active: bool, label: string} */
    public function toPayload(): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'min_days' => $this->min_days, 'max_days' => $this->max_days, 'active' => $this->active, 'label' => $this->promiseLabel()];
    }

    public function promiseLabel(): string
    {
        $days = $this->min_days === $this->max_days ? (string) $this->max_days : $this->min_days.'–'.$this->max_days;

        return $days.' '.($this->max_days === 1 ? 'day' : 'days');
    }
}
