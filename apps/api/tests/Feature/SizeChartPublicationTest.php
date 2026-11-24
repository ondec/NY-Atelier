<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SizeChartPublicationTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function publication(int $revision = 0, array $collections = []): array
    {
        return [
            'version' => '1.0', 'revision' => $revision,
            'charts' => [['id' => 'staff-product-ember-1', 'gender' => 'men', 'category' => 'trousers', 'rows' => []]],
            'products' => ['ember' => ['gender' => 'men', 'category' => 'trousers', 'chartId' => 'staff-product-ember-1']],
            'collections' => $collections ?: new \stdClass,
        ];
    }

    public function test_an_empty_publication_keeps_its_maps_as_objects(): void
    {
        $body = $this->getJson('/api/size-charts')->assertOk()->assertJsonPath('revision', 0)->getContent();

        $this->assertStringContainsString('"products":{}', $body);
        $this->assertStringContainsString('"collections":{}', $body);
    }

    public function test_staff_save_charts_that_survive_and_stale_saves_are_refused(): void
    {
        $this->signInStaff();
        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => $this->publication()])
            ->assertOk()->assertJsonPath('revision', 1)->assertJsonPath('products.ember.chartId', 'staff-product-ember-1');

        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => $this->publication()])->assertConflict();
        $this->assertDatabaseHas('size_chart_publications', ['id' => 1, 'revision' => 1]);
        $this->getJson('/api/size-charts')->assertOk()->assertJsonPath('revision', 1)->assertJsonPath('charts.0.id', 'staff-product-ember-1');
    }

    public function test_charts_carried_over_from_the_old_file_keep_a_newer_revision(): void
    {
        $this->signInStaff();
        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => $this->publication(7)])->assertOk()->assertJsonPath('revision', 8);
    }

    public function test_collection_defaults_follow_the_current_collection_garments(): void
    {
        DB::table('studio_catalogues')->insert(['id' => 1, 'revision' => 1, 'created_at' => now(), 'updated_at' => now(),
            'payload' => json_encode(['inventory' => [], 'collections' => [['id' => 'clover', 'productIds' => ['shop-ember', 'shop-amani']]]])]);
        $this->signInStaff();
        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => $this->publication(0, [
            'clover:men' => ['productIds' => ['ember'], 'profile' => ['gender' => 'men', 'category' => 'trousers']],
        ])])->assertOk();

        $this->getJson('/api/size-charts')->assertJsonPath('collections.clover:men.productIds', ['ember', 'amani']);
    }

    public function test_only_catalogue_managers_can_save_and_maps_must_be_objects(): void
    {
        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => $this->publication()])->assertUnauthorized();

        $this->signInStaff('receptionist');
        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => $this->publication()])->assertForbidden();

        $this->signInStaff();
        $this->putJson('/api/demo/staff/size-charts', ['revision' => 0, 'publication' => [...$this->publication(), 'products' => []]])->assertUnprocessable();
        $this->assertDatabaseCount('size_chart_publications', 0);
    }
}
