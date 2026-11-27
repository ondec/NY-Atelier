<?php

namespace App;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Orders a courier's stops into one road route from a chosen start (OpenStreetMap OSRM "trip" service: shortest
 * one-way trip from the first point, visiting every stop). If the routing service can't be reached, stops are ordered
 * nearest-first by straight-line distance and the route is marked estimated, so the courier can still go.
 */
class DeliveryRoutePlanner
{
    /**
     * @param  array{latitude: float, longitude: float}  $start
     * @param  list<array{key: string, latitude: float, longitude: float}>  $stops
     * @param  array{latitude: float, longitude: float}|null  $end  Where the route must finish (a shop), or anywhere.
     * @return array{order: list<string>, legs: list<array{distance_m: int, duration_s: int}>, distance_m: ?int, duration_s: ?int, path: list<array{0: float, 1: float}>, estimated: bool}
     */
    public function plan(array $start, array $stops, ?array $end = null): array
    {
        if ($stops === [] && $end === null) {
            return ['order' => [], 'legs' => [], 'distance_m' => 0, 'duration_s' => 0, 'path' => [], 'estimated' => false];
        }
        $points = [$start, ...$stops, ...($end ? [$end] : [])];
        $coordinates = implode(';', array_map(fn (array $point): string => round($point['longitude'], 6).','.round($point['latitude'], 6), $points));

        try {
            $response = Http::timeout(12)->acceptJson()->get(rtrim((string) config('services.osrm.url'), '/')."/trip/v1/driving/{$coordinates}", [
                'source' => 'first', 'roundtrip' => 'false', 'destination' => $end ? 'last' : 'any', 'geometries' => 'geojson', 'overview' => 'full',
            ]);
            $trip = $response->json('trips.0');
            $waypoints = $response->json('waypoints');
            if ($response->successful() && $response->json('code') === 'Ok' && is_array($trip) && is_array($waypoints) && count($waypoints) === count($points)) {
                $position = [];
                foreach (array_slice($waypoints, 1, count($stops), true) as $index => $waypoint) {
                    $position[$stops[$index - 1]['key']] = (int) $waypoint['waypoint_index'];
                }
                asort($position);

                return [
                    'order' => array_keys($position),
                    'legs' => array_map(fn (array $leg): array => ['distance_m' => (int) round($leg['distance'] ?? 0), 'duration_s' => (int) round($leg['duration'] ?? 0)], $trip['legs'] ?? []),
                    'distance_m' => (int) round($trip['distance'] ?? 0), 'duration_s' => (int) round($trip['duration'] ?? 0),
                    'path' => array_map(fn (array $point): array => [(float) $point[1], (float) $point[0]], $trip['geometry']['coordinates'] ?? []),
                    'estimated' => false,
                ];
            }
        } catch (ConnectionException) {
            // Fall through to the straight-line estimate.
        }

        return $this->nearestFirst($start, $stops, $end);
    }

    /**
     * A route with a pick-up at a shop part-way: orders waiting at the shop are delivered after it; stops already
     * on board go before or after it, whichever makes the whole drive shorter. The pick-up appears in the order as
     * `pickup`. Optionally finishes at a shop.
     *
     * @param  array{latitude: float, longitude: float}  $start
     * @param  list<array{key: string, latitude: float, longitude: float}>  $onBoard
     * @param  array{latitude: float, longitude: float}  $pickup
     * @param  list<array{key: string, latitude: float, longitude: float}>  $waiting
     * @param  array{latitude: float, longitude: float}|null  $end
     * @return array{order: list<string>, legs: list<array{distance_m: int, duration_s: int}>, distance_m: ?int, duration_s: ?int, path: list<array{0: float, 1: float}>, estimated: bool}
     */
    public function planWithPickup(array $start, array $onBoard, array $pickup, array $waiting, ?array $end = null): array
    {
        $deliverFirst = $this->join($this->plan($start, $onBoard, $pickup), $this->plan($pickup, $waiting, $end));
        if ($onBoard === []) {
            return $deliverFirst;
        }
        $pickupFirst = $this->join($this->plan($start, [], $pickup), $this->plan($pickup, [...$onBoard, ...$waiting], $end));
        $cost = fn (array $route): float => $route['estimated'] ? (float) array_sum(array_column($route['legs'], 'distance_m')) : (float) $route['duration_s'];

        return $cost($pickupFirst) < $cost($deliverFirst) ? $pickupFirst : $deliverFirst;
    }

    /** Joins the drive to the pick-up with the drive after it. */
    private function join(array $toPickup, array $afterPickup): array
    {
        $estimated = $toPickup['estimated'] || $afterPickup['estimated'];
        $afterPath = $afterPickup['path'];

        return [
            'order' => [...$toPickup['order'], 'pickup', ...$afterPickup['order']],
            'legs' => [...$toPickup['legs'], ...$afterPickup['legs']],
            'distance_m' => $estimated ? null : $toPickup['distance_m'] + $afterPickup['distance_m'],
            'duration_s' => $estimated ? null : $toPickup['duration_s'] + $afterPickup['duration_s'],
            'path' => [...$toPickup['path'], ...array_slice($afterPath, $toPickup['path'] !== [] && $afterPath !== [] ? 1 : 0)],
            'estimated' => $estimated,
        ];
    }

    /**
     * @param  array{latitude: float, longitude: float}  $start
     * @param  list<array{key: string, latitude: float, longitude: float}>  $stops
     * @return array{order: list<string>, legs: list<array{distance_m: int, duration_s: int}>, distance_m: ?int, duration_s: ?int, path: list<array{0: float, 1: float}>, estimated: bool}
     */
    private function nearestFirst(array $start, array $stops, ?array $end = null): array
    {
        $order = [];
        $legs = [];
        $path = [[$start['latitude'], $start['longitude']]];
        $here = $start;
        while ($stops !== []) {
            usort($stops, fn (array $a, array $b): int => $this->metres($here, $a) <=> $this->metres($here, $b));
            $next = array_shift($stops);
            $legs[] = ['distance_m' => (int) round($this->metres($here, $next)), 'duration_s' => 0];
            $order[] = $next['key'];
            $path[] = [$next['latitude'], $next['longitude']];
            $here = $next;
        }

        if ($end) {
            $legs[] = ['distance_m' => (int) round($this->metres($here, $end)), 'duration_s' => 0];
            $path[] = [$end['latitude'], $end['longitude']];
        }

        return ['order' => $order, 'legs' => $legs, 'distance_m' => null, 'duration_s' => null, 'path' => $path, 'estimated' => true];
    }

    /** @param array{latitude: float, longitude: float} $a @param array{latitude: float, longitude: float} $b */
    private function metres(array $a, array $b): float
    {
        $rad = M_PI / 180;
        $h = sin(($b['latitude'] - $a['latitude']) * $rad / 2) ** 2
            + cos($a['latitude'] * $rad) * cos($b['latitude'] * $rad) * sin(($b['longitude'] - $a['longitude']) * $rad / 2) ** 2;

        return 12742000 * asin(min(1, sqrt($h)));
    }
}
