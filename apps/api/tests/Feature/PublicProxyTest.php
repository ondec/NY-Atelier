<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProxyTest extends TestCase
{
    use RefreshDatabase;

    public function test_visitors_forwarded_by_the_portal_get_their_own_rate_limit(): void
    {
        $fromPortal = fn (string $visitor) => $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeader('X-Forwarded-For', $visitor)->getJson('/api/shop/catalogue');

        for ($i = 0; $i < 60; $i++) {
            $fromPortal('203.0.113.10')->assertOk();
        }
        $fromPortal('203.0.113.10')->assertTooManyRequests();
        $fromPortal('203.0.113.11')->assertOk();
    }

    public function test_forwarded_addresses_from_elsewhere_are_ignored(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.7'])->withHeader('X-Forwarded-For', '203.0.113.10')
            ->getJson('/api/shop/catalogue')->assertOk();

        $this->assertSame('198.51.100.7', request()->ip());
    }
}
