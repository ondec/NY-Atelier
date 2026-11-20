<?php

namespace App;

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudioSales
{
    public function catalogue(bool $lock = false): ?object
    {
        return DB::table('studio_catalogues')->where('id', 1)->when($lock, fn ($query) => $query->lockForUpdate())->first();
    }

    public function serializeCatalogue(object $row): array
    {
        return [...json_decode($row->payload, true), 'revision' => (int) $row->revision, 'updatedAt' => $row->updated_at];
    }

    public function quote(array $data, ?object $catalogue = null): array
    {
        $catalogue ??= $this->catalogue();
        abort_unless($catalogue, 409, 'The shared catalogue is not ready. Refresh NY Studio.');
        $inventory = json_decode($catalogue->payload, true)['inventory'];
        $variants = collect($inventory['variants'])->keyBy('id');
        $products = collect($inventory['products'])->keyBy('id');
        $lines = [];
        foreach ($data['lines'] as $line) {
            $variant = $variants->get($line['variantId']);
            $product = $variant ? $products->get($variant['productId']) : null;
            if (! $product || $variant['quantity'] < $line['quantity']) {
                throw ValidationException::withMessages(['lines' => 'Stock changed. Review the selected garments and quantities.']);
            }
            $key = json_encode([$variant['productId'], mb_strtolower(trim($variant['colour'])), mb_strtolower(trim($variant['fabric'] ?? ''))], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $visual = $inventory['visuals'][$key] ?? [];
            $price = (int) round($product['price'] * 100);
            $lines[] = [
                'variantId' => $variant['id'], 'name' => $product['name'], 'colour' => $variant['colour'], 'fabric' => $variant['fabric'] ?? '',
                'size' => $variant['size'], 'sku' => $variant['sku'], 'quantity' => $line['quantity'], 'unit_minor' => $price,
                'total_minor' => $price * $line['quantity'],
                'photo' => $visual['gallery'][0] ?? $visual['photo'] ?? $product['gallery'][0] ?? $product['photo'] ?? null,
            ];
        }
        $total = array_sum(array_column($lines, 'total_minor'));
        if ($total <= 0) {
            throw ValidationException::withMessages(['lines' => 'Every sale must have a positive total. Review the garment prices.']);
        }

        return ['lines' => $lines, 'total_minor' => $total, 'currency' => 'GHS', 'revision' => (int) $catalogue->revision];
    }

    public function complete(array $data, User $actor): array
    {
        $hash = hash('sha256', json_encode([$actor->id, $data]));

        return DB::transaction(function () use ($data, $hash, $actor): array {
            $catalogue = $this->catalogue(true);
            abort_unless($catalogue, 409, 'The shared catalogue is not ready. Refresh NY Studio.');
            $existing = DB::table('studio_sales')->where('id', $data['request_id'])->first();
            if ($existing) {
                abort_unless(hash_equals($existing->request_hash, $hash), 409, 'This checkout was already used for different details. Review the recorded receipt.');

                return ['receipt' => json_decode($existing->receipt, true), 'replayed' => true];
            }
            $quote = $this->quote($data, $catalogue);
            abort_if($quote['revision'] !== $data['revision'] || $quote['total_minor'] !== $data['total_minor'], 409, 'Prices or stock changed. Review the sale again before recording payment.');
            if ($data['payment_method'] === 'cash' && $data['tendered_minor'] < $quote['total_minor']) {
                throw ValidationException::withMessages(['tendered_minor' => 'Cash received must cover the total.']);
            }
            $reference = $data['payment_method'] === 'cash' ? null : mb_strtoupper(trim($data['payment_reference']));
            abort_if($reference && DB::table('studio_sales')->where('payment_method', $data['payment_method'])->where('payment_reference', $reference)->exists(), 409, 'This payment reference is already recorded. Check the original receipt.');
            $customer = Customer::query()->findOrFail($data['customer_id']);
            $collected = $data['handover'] === 'take-away';
            $orderReference = 'NY-RTW-'.mb_strtoupper(str_replace('-', '', $data['request_id']));
            $order = Order::query()->create([
                'reference' => $orderReference, 'customer_id' => $customer->id, 'category' => 'Ready-to-Wear', 'source' => 'studio',
                'status' => $collected ? 'Collected' : 'Order received', 'workflow_stage' => $collected ? 'collected' : 'received',
                'workflow_version' => 1, 'payment_status' => 'Paid',
                'fulfilment_method' => $data['handover'] === 'delivery' ? 'Delivery' : 'Collection',
                'fulfilment_status' => $collected ? 'Collected' : 'To be arranged',
                'handover_instructions' => $data['instructions'] ?? null, 'completed_at' => $collected ? now() : null,
            ]);
            $order->items()->createMany(array_map(fn (array $line, int $index): array => [
                'garment_name' => mb_substr(implode(' · ', array_filter([$line['name'], $line['colour'], $line['fabric'], 'Size '.$line['size'], 'Qty '.$line['quantity']])), 0, 255),
                'status' => $collected ? 'Collected' : 'Order received', 'sort_order' => $index, 'completed_at' => $collected ? now() : null,
            ], $quote['lines'], array_keys($quote['lines'])));
            $order->events()->create(['title' => 'Order received', 'stage_key' => 'received', 'action_type' => 'created', 'occurred_at' => now(), 'explanation' => 'Purchased at NY Studio.']);
            $order->events()->create(['title' => 'Payment recorded', 'action_type' => 'payment', 'occurred_at' => now(), 'explanation' => 'Paid GHS '.number_format($quote['total_minor'] / 100, 2).' by '.str_replace('-', ' ', $data['payment_method']).'.']);
            if ($collected) {
                $order->events()->create(['title' => 'Collected', 'stage_key' => 'collected', 'action_type' => 'advance', 'occurred_at' => now(), 'explanation' => 'Staff confirmed the garments were checked and handed to '.$customer->name.' at NY Studio.']);
            }
            $tendered = $data['payment_method'] === 'cash' ? $data['tendered_minor'] : $quote['total_minor'];
            $receipt = [...$quote, 'staff' => ['id' => $actor->id, 'name' => $actor->name, 'role' => $actor->staff_role], 'id' => $data['request_id'], 'reference' => $orderReference, 'customer' => ['id' => $customer->id, 'name' => $customer->name],
                'payment_method' => $data['payment_method'], 'payment_reference' => $reference, 'tendered_minor' => $tendered, 'change_minor' => $tendered - $quote['total_minor'],
                'handover' => $data['handover'], 'instructions' => $data['instructions'] ?? null, 'paid_at' => now()->toIso8601String(), 'status' => 'Paid',
            ];
            DB::table('studio_sales')->insert([
                'id' => $data['request_id'], 'order_id' => $order->id, 'recorded_by' => $actor->id, 'request_hash' => $hash, 'payment_method' => $data['payment_method'], 'payment_reference' => $reference,
                'total_minor' => $quote['total_minor'], 'receipt' => json_encode($receipt), 'created_at' => now(), 'updated_at' => now(),
            ]);
            $payload = json_decode($catalogue->payload, true);
            foreach ($quote['lines'] as $line) {
                foreach ($payload['inventory']['variants'] as &$variant) {
                    if ($variant['id'] === $line['variantId']) {
                        $variant['quantity'] -= $line['quantity'];
                    }
                }
                unset($variant);
                $payload['inventory']['movements'][] = ['id' => $data['request_id'].'-'.$line['variantId'], 'variantId' => $line['variantId'], 'change' => -$line['quantity'], 'reason' => 'Sale', 'note' => $orderReference, 'occurredAt' => now()->toIso8601String()];
            }
            DB::table('studio_catalogues')->where('id', 1)->update(['payload' => json_encode($payload), 'revision' => $catalogue->revision + 1, 'updated_at' => now()]);

            return ['receipt' => $receipt, 'replayed' => false];
        }, 3);
    }
}
