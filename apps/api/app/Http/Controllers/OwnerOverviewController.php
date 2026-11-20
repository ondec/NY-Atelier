<?php

namespace App\Http\Controllers;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class OwnerOverviewController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless(config('demo.enabled') && in_array($request->ip(), ['127.0.0.1', '::1'], true), 404);
        $data = $request->validate(['period' => ['sometimes', Rule::in(['month', '30days', 'year'])]]);
        $period = $data['period'] ?? 'month';
        $today = CarbonImmutable::now('Africa/Accra')->startOfDay();
        $start = match ($period) {
            '30days' => $today->subDays(29),
            'year' => $today->startOfYear(),
            default => $today->startOfMonth(),
        };
        $end = $today->addDay();
        $days = (int) $start->diffInDays($end);
        $previousStart = $start->subDays($days);
        $current = $this->sales($start, $end)->selectRaw('COUNT(*) as count, COALESCE(SUM(total_minor), 0) as total')->first();
        $previous = $this->sales($previousStart, $start)->selectRaw('COUNT(*) as count, COALESCE(SUM(total_minor), 0) as total')->first();
        $daily = $this->sales($start, $end)->selectRaw('DATE(created_at) as day, SUM(total_minor) as total')->groupByRaw('DATE(created_at)')->orderBy('day')->get();
        $grouped = [];
        foreach ($daily as $row) {
            $key = $period === 'year' ? substr($row->day, 0, 7).'-01' : $row->day;
            $grouped[$key] = ($grouped[$key] ?? 0) + (int) $row->total;
        }
        $series = [];
        for ($date = $start; $date->lt($end); $date = $period === 'year' ? $date->addMonth() : $date->addDay()) {
            $series[] = ['date' => $date->toDateString(), 'total_minor' => $grouped[$date->toDateString()] ?? 0];
        }
        $paidByBatch = DB::table('salary_payments')->selectRaw('batch_id, SUM(amount_minor) as paid')->groupBy('batch_id')->pluck('paid', 'batch_id');
        $outstanding = 0;
        foreach (DB::table('salary_batches')->where('status', 'approved')->select(['id', 'entries'])->cursor() as $batch) {
            $total = 0;
            foreach (json_decode($batch->entries, true, 512, JSON_THROW_ON_ERROR) as $entry) {
                $total += array_sum(array_column($entry['lines'], 'amount_minor')) + ($entry['adjustment_minor'] ?? 0);
            }
            $outstanding += max(0, $total - (int) ($paidByBatch[$batch->id] ?? 0));
        }

        return response()->json([
            'period' => $period,
            'from' => $start->toDateString(), 'to' => $today->toDateString(),
            'previous_from' => $previousStart->toDateString(), 'previous_to' => $start->subDay()->toDateString(),
            'sales_minor' => (int) $current->total, 'sales_count' => (int) $current->count,
            'previous_sales_minor' => (int) $previous->total, 'previous_sales_count' => (int) $previous->count,
            'average_sale_minor' => $current->count ? (int) round($current->total / $current->count) : null,
            'series' => $series,
            'payroll_paid_minor' => (int) DB::table('salary_payments')->whereBetween('paid_on', [$start->toDateString(), $today->toDateString()])->sum('amount_minor'),
            'payroll_outstanding_minor' => $outstanding,
            'salary_approvals' => DB::table('salary_batches')->where('status', 'submitted')->count(),
            'scope' => 'Studio receipts and recorded tailor payroll only. Other expenses and profit are not included.',
            'updated_at' => CarbonImmutable::now('Africa/Accra')->toIso8601String(),
        ])->header('Cache-Control', 'no-store');
    }

    private function sales(CarbonImmutable $start, CarbonImmutable $end): Builder
    {
        return DB::table('studio_sales')->where('created_at', '>=', $start)->where('created_at', '<', $end);
    }
}
