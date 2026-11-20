<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DemoSalaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->staffOnly($request);
        $batches = DB::table('salary_batches')->orderByDesc('created_at')->orderByDesc('id')->get();
        $payments = DB::table('salary_payments')->orderBy('created_at')->get()->groupBy('batch_id');

        return response()->json(['batches' => $batches->map(fn (object $batch): array => $this->serialize($batch, $payments->get($batch->id, collect())->all()))]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->staffOnly($request);

        return response()->json($this->detail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $this->staffOnly($request);
        $data = $this->batchInput($request);
        $request->validate(['request_id' => ['required', 'uuid']]);
        $id = $request->string('request_id')->toString();
        DB::transaction(function () use ($data, $id): void {
            $inserted = DB::table('salary_batches')->insertOrIgnore([
                'id' => $id, ...$data, 'entries' => json_encode($data['entries'], JSON_THROW_ON_ERROR),
                'status' => 'draft', 'version' => 1, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($inserted) {
                $this->event($id, $id, 'created', $data['prepared_by'], null, $data);
            }
        });

        return response()->json($this->detail($id), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->staffOnly($request);
        $input = $request->validate([
            'request_id' => ['required', 'uuid'], 'version' => ['required', 'integer', 'min:1'],
            'action' => ['required', Rule::in(['save', 'submit', 'approve', 'return', 'reopen', 'payment'])],
            'actor' => ['required', 'string', 'max:150'], 'note' => ['nullable', 'string', 'max:1000', 'required_if:action,return,reopen'],
        ]);
        DB::transaction(function () use ($request, $id, $input): void {
            $batch = DB::table('salary_batches')->where('id', $id)->lockForUpdate()->first();
            abort_unless($batch, 404);
            $duplicate = DB::table('salary_events')->where('request_id', $input['request_id'])->first();
            if ($duplicate) {
                abort_unless($duplicate->batch_id === $id, 409, 'This request belongs to a different batch.');

                return;
            }
            abort_unless($batch->version === (int) $input['version'], 409, 'This batch changed. Refresh it before continuing.');
            $entries = json_decode($batch->entries, true, 512, JSON_THROW_ON_ERROR);
            $changes = [];
            $action = $input['action'];
            if ($action === 'save') {
                abort_unless(in_array($batch->status, ['draft', 'returned'], true), 422, 'Only draft or returned batches can be edited.');
                $changes = $this->batchInput($request);
                $changes['entries'] = json_encode($changes['entries'], JSON_THROW_ON_ERROR);
            } elseif ($action === 'submit') {
                abort_unless(in_array($batch->status, ['draft', 'returned'], true), 422, 'This batch is already submitted.');
                $changes['status'] = 'submitted';
            } elseif ($action === 'approve' || $action === 'return') {
                abort_unless($batch->status === 'submitted', 422, 'Submit this batch for review first.');
                $changes['status'] = $action === 'approve' ? 'approved' : 'returned';
                if ($action === 'approve') {
                    $changes['approved_by'] = $input['actor'];
                    $changes['approved_at'] = now();
                }
            } elseif ($action === 'reopen') {
                abort_unless($batch->status === 'approved' && ! DB::table('salary_payments')->where('batch_id', $id)->exists(), 422, 'Only approved batches without payments can be reopened.');
                $changes = ['status' => 'returned', 'approved_by' => null, 'approved_at' => null];
            } else {
                abort_unless($batch->status === 'approved', 422, 'Approve this batch before recording a payment.');
                $payment = $request->validate([
                    'entry_id' => ['required', 'uuid'], 'amount_minor' => ['required', 'integer', 'min:1', 'max:100000000'],
                    'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Africa/Accra')->toDateString()],
                    'method' => ['required', Rule::in(['Cash', 'Mobile money', 'Bank transfer'])],
                    'reference' => ['required', 'string', 'max:150'],
                ]);
                $entry = collect($entries)->firstWhere('id', $payment['entry_id']);
                abort_unless($entry, 422, 'Choose a tailor in this batch.');
                $paid = (int) DB::table('salary_payments')->where('batch_id', $id)->where('entry_id', $entry['id'])->sum('amount_minor');
                abort_if($payment['amount_minor'] > $this->entryTotal($entry) - $paid, 422, 'The payment exceeds this tailor’s remaining balance.');
                DB::table('salary_payments')->insert([
                    ...$payment, 'id' => $input['request_id'], 'batch_id' => $id,
                    'recorded_by' => $input['actor'], 'created_at' => now(),
                ]);
            }
            $changed = DB::table('salary_batches')->where('id', $id)->where('version', $input['version'])->update([
                ...$changes, 'version' => $batch->version + 1, 'updated_at' => now(),
            ]);
            abort_unless($changed, 409, 'This batch changed. Refresh it before continuing.');
            $this->event($id, $input['request_id'], $action, $input['actor'], $input['note'] ?? null,
                $action === 'save' ? ['before' => $entries, 'after' => json_decode($changes['entries'], true), 'period_start' => $changes['period_start'], 'period_end' => $changes['period_end'], 'label' => $changes['label']] : null);
        }, 3);

        return response()->json($this->detail($id));
    }

    private function batchInput(Request $request): array
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:100'], 'period_start' => ['required', 'date_format:Y-m-d'],
            'period_end' => ['required', 'date_format:Y-m-d', 'after_or_equal:period_start'],
            'prepared_by' => ['required', 'string', 'max:150'],
            'entries' => ['required', 'array', 'min:1', 'max:100'],
            'entries.*' => ['required', 'array:id,name,lines,adjustment_minor,adjustment_reason'],
            'entries.*.id' => ['required', 'uuid', 'distinct'], 'entries.*.name' => ['required', 'string', 'max:150'],
            'entries.*.lines' => ['required', 'array', 'min:1', 'max:50'],
            'entries.*.lines.*' => ['required', 'array:description,quantity,amount_minor,order_reference'],
            'entries.*.lines.*.description' => ['required', 'string', 'max:300'],
            'entries.*.lines.*.quantity' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'entries.*.lines.*.amount_minor' => ['required', 'integer', 'min:0', 'max:100000000'],
            'entries.*.lines.*.order_reference' => ['nullable', 'string', Rule::exists('orders', 'reference')],
            'entries.*.adjustment_minor' => ['required', 'integer', 'min:-100000000', 'max:100000000'],
            'entries.*.adjustment_reason' => ['nullable', 'string', 'max:500'],
        ]);
        $data['entries'] = array_map(function (array $entry): array {
            $entry['name'] = trim($entry['name']);
            $entry['adjustment_minor'] = (int) $entry['adjustment_minor'];
            $entry['lines'] = array_map(fn (array $line): array => [
                ...$line, 'amount_minor' => (int) $line['amount_minor'],
                'quantity' => isset($line['quantity']) ? (int) $line['quantity'] : null,
                'order_reference' => $line['order_reference'] ?? null,
            ], $entry['lines']);

            return $entry;
        }, $data['entries']);
        $names = [];
        foreach ($data['entries'] as $i => $entry) {
            $name = mb_strtolower(trim($entry['name']));
            if (in_array($name, $names, true)) {
                throw ValidationException::withMessages(["entries.$i.name" => 'Use one row per tailor and add work lines to their breakdown.']);
            }
            $names[] = $name;
            if ($this->entryTotal($entry) <= 0 || ((int) $entry['adjustment_minor'] !== 0 && empty($entry['adjustment_reason']))) {
                throw ValidationException::withMessages(["entries.$i.adjustment_minor" => 'Each tailor needs a positive payable amount and a reason for any adjustment.']);
            }
        }

        return $data;
    }

    private function entryTotal(array $entry): int
    {
        return array_sum(array_column($entry['lines'], 'amount_minor')) + $entry['adjustment_minor'];
    }

    private function serialize(object $batch, array $payments): array
    {
        $entries = json_decode($batch->entries, true, 512, JSON_THROW_ON_ERROR);
        $total = array_sum(array_map(fn (array $entry): int => $this->entryTotal($entry), $entries));
        $paid = (int) array_sum(array_column($payments, 'amount_minor'));

        return [...(array) $batch, 'entries' => $entries, 'total_minor' => $total, 'paid_minor' => $paid,
            'payment_status' => $paid === 0 ? 'Unpaid' : ($paid === $total ? 'Paid' : 'Part-paid'), 'payments' => $payments];
    }

    private function detail(string $id): array
    {
        $batch = DB::table('salary_batches')->where('id', $id)->first();
        abort_unless($batch, 404);
        $result = $this->serialize($batch, DB::table('salary_payments')->where('batch_id', $id)->orderBy('created_at')->get()->all());
        $result['events'] = DB::table('salary_events')->where('batch_id', $id)->orderByDesc('id')->get(['id', 'action', 'actor', 'note', 'created_at']);

        return $result;
    }

    private function event(string $id, string $requestId, string $action, string $actor, ?string $note, ?array $snapshot): void
    {
        DB::table('salary_events')->insert([
            'batch_id' => $id, 'request_id' => $requestId, 'action' => $action, 'actor' => $actor, 'note' => $note,
            'snapshot' => $snapshot ? json_encode($snapshot, JSON_THROW_ON_ERROR) : null, 'created_at' => now(),
        ]);
    }

    private function staffOnly(Request $request): void
    {
        abort_unless(config('demo.enabled') && in_array($request->ip(), ['127.0.0.1', '::1'], true), 404);
    }
}
