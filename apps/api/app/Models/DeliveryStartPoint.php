<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A shop or other place a courier can start a delivery route from. */
class DeliveryStartPoint extends Model
{
    protected $fillable = ['name', 'address', 'latitude', 'longitude', 'sort_order', 'active'];

    protected function casts(): array
    {
        return ['latitude' => 'float', 'longitude' => 'float', 'sort_order' => 'integer', 'active' => 'boolean'];
    }

    /** @return array{id: int, name: string, address: ?string, latitude: float, longitude: float, active: bool} */
    public function toPayload(): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'address' => $this->address, 'latitude' => $this->latitude, 'longitude' => $this->longitude, 'active' => $this->active];
    }
}
