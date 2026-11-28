<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_busy_browsing_does_not_use_up_another_routes_limit(): void
    {
        for ($i = 0; $i < 12; $i++) {
            $this->getJson('/api/shop/catalogue')->assertOk();
        }

        // The booking route (5 a minute) still has its own full allowance.
        $this->postJson('/api/consultations', [])->assertUnprocessable();
    }

    public function test_a_route_still_stops_at_its_own_limit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/consultations', [])->assertUnprocessable();
        }
        $this->postJson('/api/consultations', [])->assertTooManyRequests();
    }
}
