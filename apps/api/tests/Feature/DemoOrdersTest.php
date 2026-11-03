<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoOrdersTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_orders_share_the_grouped_custom_progress(): void
    {
        config()->set('demo.enabled', true);
        $this->seed();

        $response = $this->getJson('/api/demo/orders');

        $response->assertOk()
            ->assertJsonPath('demo', true)
            ->assertJsonCount(4, 'orders')
            ->assertJsonFragment([
                'reference' => 'NY-CUS-000001',
                'item_count' => 3,
                'completed_item_count' => 1,
            ]);
    }

    public function test_demo_route_is_hidden_when_demo_mode_is_disabled(): void
    {
        config()->set('demo.enabled', false);

        $this->getJson('/api/demo/orders')->assertNotFound();
    }
}
