<?php

namespace App\Http\Controllers;

use App\StaffAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FinanceOverviewController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): JsonResponse
    {
        StaffAccess::requireStaffToken($request);
        $data = $request->validate(['period' => ['sometimes', 'string', Rule::in(['month', '30days', 'year'])]]);
        $period = $data['period'] ?? 'year';
        $today = CarbonImmutable::now('Africa/Accra')->startOfDay();
        $start = match ($period) {
            'month' => $today->startOfMonth(),
            '30days' => $today->subDays(29),
            default => $today->startOfYear(),
        };
        $end = $today->addDay();
        $sales = DB::table('studio_sales')->where('studio_sales.created_at', '>=', $start)->where('studio_sales.created_at', '<', $end);
        $payroll = DB::table('salary_payments')->whereBetween('paid_on', [$start->toDateString(), $today->toDateString()]);
        $dailyIncome = (clone $sales)->selectRaw('DATE(created_at) as day, SUM(total_minor) as total, COUNT(*) as count')->groupByRaw('DATE(created_at)')->get();
        $dailyExpenses = (clone $payroll)->selectRaw('paid_on as day, SUM(amount_minor) as total, COUNT(*) as count')->groupBy('paid_on')->get();
        $buckets = [];
        foreach ([['received_minor', $dailyIncome], ['spent_minor', $dailyExpenses]] as [$field, $rows]) {
            foreach ($rows as $row) {
                $key = $period === 'year' ? substr($row->day, 0, 7).'-01' : $row->day;
                $buckets[$key][$field] = ($buckets[$key][$field] ?? 0) + (int) $row->total;
            }
        }
        $series = [];
        $cumulative = 0;
        for ($date = $start; $date->lt($end); $date = $period === 'year' ? $date->addMonth() : $date->addDay()) {
            $key = $date->toDateString();
            $received = $buckets[$key]['received_minor'] ?? 0;
            $spent = $buckets[$key]['spent_minor'] ?? 0;
            $cumulative += $received - $spent;
            $series[] = ['date' => $key, 'received_minor' => $received, 'spent_minor' => $spent, 'net_minor' => $received - $spent, 'cumulative_minor' => $cumulative];
        }
        $received = (int) $dailyIncome->sum('total');
        $spent = (int) $dailyExpenses->sum('total');
        $incomeActivity = (clone $sales)->join('orders', 'orders.id', '=', 'studio_sales.order_id')
            ->orderByDesc('studio_sales.created_at')->orderByDesc('studio_sales.id')->limit(6)
            ->get(['studio_sales.id', 'studio_sales.created_at', 'studio_sales.total_minor', 'orders.reference'])
            ->map(fn ($row) => ['id' => 'sale-'.$row->id, 'date' => substr($row->created_at, 0, 10), 'label' => $row->reference, 'category' => 'Ready-to-Wear', 'direction' => 'in', 'amount_minor' => (int) $row->total_minor, 'register' => 'sales']);
        $expenseActivity = (clone $payroll)->join('salary_batches', 'salary_batches.id', '=', 'salary_payments.batch_id')
            ->orderByDesc('paid_on')->orderByDesc('salary_payments.id')->limit(6)
            ->get(['salary_payments.id', 'paid_on', 'amount_minor', 'salary_batches.label'])
            ->map(fn ($row) => ['id' => 'salary-'.$row->id, 'date' => $row->paid_on, 'label' => $row->label, 'category' => 'Tailor salaries', 'direction' => 'out', 'amount_minor' => (int) $row->amount_minor, 'register' => 'salaries']);

        return response()->json([
            'period' => $period, 'from' => $start->toDateString(), 'to' => $today->toDateString(), 'currency' => 'GHS',
            'received_minor' => $received, 'spent_minor' => $spent, 'net_minor' => $received - $spent,
            'received_count' => (int) $dailyIncome->sum('count'), 'spent_count' => (int) $dailyExpenses->sum('count'),
            'series' => $series,
            'income_sources' => [
                ['id' => 'rtw', 'label' => 'Ready-to-Wear', 'total_minor' => $received, 'connected' => true],
                ['id' => 'bespoke', 'label' => 'Atelier & bespoke', 'total_minor' => null, 'connected' => false],
                ['id' => 'alterations', 'label' => 'Alterations', 'total_minor' => null, 'connected' => false],
                ['id' => 'other', 'label' => 'Other income', 'total_minor' => null, 'connected' => false],
            ],
            'expense_categories' => [['id' => 'payroll', 'label' => 'Tailor salaries', 'total_minor' => $spent, 'connected' => true]],
            'payment_methods' => (clone $sales)->selectRaw('payment_method, SUM(total_minor) as total')->groupBy('payment_method')->orderBy('payment_method')->get()
                ->map(fn ($row) => ['id' => $row->payment_method, 'total_minor' => (int) $row->total])->values(),
            'recent_activity' => $incomeActivity->concat($expenseActivity)->sortBy([['date', 'desc'], ['id', 'desc']])->take(6)->values(),
            'scope' => 'Includes confirmed Studio receipts and recorded tailor salary payments. Other income, business expenses and bank balances are not connected yet.',
            'updated_at' => CarbonImmutable::now('Africa/Accra')->toIso8601String(),
        ])->header('Cache-Control', 'no-store');
    }
}
