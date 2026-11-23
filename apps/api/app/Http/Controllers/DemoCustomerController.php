<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\StaffAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DemoCustomerController extends Controller
{
    private const PAGE = 50;

    private const MAX_PAGE = 100;

    private const MEASUREMENTS = [
        'height' => 'Height', 'weight' => 'Weight', 'neck' => 'Neck', 'shoulder' => 'Shoulder width',
        'chest' => 'Chest / bust', 'waist' => 'Waist', 'hips' => 'Hips', 'sleeve' => 'Sleeve length',
        'arm' => 'Upper arm', 'wrist' => 'Wrist', 'top_length' => 'Top length',
        'inseam' => 'Inseam', 'outseam' => 'Outseam', 'thigh' => 'Thigh',
        'trouser_waist' => 'Waist at trouser waistband', 'rise' => 'Total crotch length',
        'knee' => 'Knee circumference', 'hem' => 'Finished leg opening circumference',
        'agbada_length' => 'Finished outer robe length', 'agbada_span' => 'Finished outer robe span',
        'jacket_length' => 'Finished jacket length', 'short_sleeve' => 'Finished short sleeve length',
        'sleeve_opening' => 'Finished sleeve opening circumference',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->staffOnly($request);
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PAGE],
        ]);
        $perPage = (int) ($data['per_page'] ?? self::PAGE);
        $page = (int) ($data['page'] ?? 1);
        $query = self::search(Customer::query(), (string) ($data['q'] ?? ''));
        $total = (clone $query)->count();

        return response()->json([
            'customers' => $query->orderBy('name')->orderBy('id')->forPage($page, $perPage)->get(['id', 'name', 'email', 'phone', 'account_reference']),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'has_more' => $page * $perPage < $total,
            'fields' => self::MEASUREMENTS,
            'templates' => config('fittings.templates'),
        ]);
    }

    /**
     * Match every word of the search against name, email, phone or account reference, case-insensitively.
     * Phone matching ignores spaces, dashes and brackets so "024 123" finds "+233 24 123 4567".
     *
     * @param  Builder<Customer>  $query
     * @return Builder<Customer>
     */
    public static function search(Builder $query, string $search): Builder
    {
        $search = trim($search);
        $digits = ltrim((string) preg_replace('/\D+/', '', $search), '0');
        if (preg_match('/^[\d\s+().-]+$/', $search) && strlen($digits) >= 3) {
            // A search made only of phone characters is one number: "024 123" means +23324123…, not "024" or "123" anywhere.
            $like = '%'.addcslashes(Str::lower($search), '\\%_').'%';

            return $query->where(fn (Builder $match) => $match->where('phone_e164', 'like', '%'.$digits.'%')
                ->orWhereRaw('LOWER(account_reference) LIKE ?', [$like]));
        }

        foreach (preg_split('/\s+/', Str::lower($search), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
            $like = '%'.addcslashes($word, '\\%_').'%';
            $query->where(fn (Builder $match) => $match->whereRaw('LOWER(name) LIKE ?', [$like])
                ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                ->orWhereRaw('LOWER(account_reference) LIKE ?', [$like])
                ->orWhereRaw('LOWER(phone) LIKE ?', [$like]));
        }

        return $query;
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        $this->staffOnly($request);
        $measurements = DB::table('customer_measurements')->where('customer_id', $customer->id)
            ->orderByDesc('measured_on')->orderByDesc('id')->get();
        $attachments = DB::table('fitting_attachments')->whereIn('measurement_id', $measurements->pluck('id'))
            ->orderBy('created_at')->orderBy('id')->get(['id', 'measurement_id', 'name', 'mime_type', 'size'])->groupBy('measurement_id');

        return response()->json([
            'customer' => $customer->only(['id', 'name', 'email', 'phone', 'account_reference']),
            'measurements' => $measurements->map(fn (object $row): array => [
                'id' => $row->id, 'measured_on' => $row->measured_on, 'notes' => $row->notes,
                'garment_type' => $row->garment_type, 'unit' => 'cm', 'recorded_unit' => $row->recorded_unit,
                'values' => json_decode($row->values, true, 512, JSON_THROW_ON_ERROR),
                'additional_measurements' => json_decode($row->additional_measurements ?? '[]', true, 512, JSON_THROW_ON_ERROR),
                'attachments' => ($attachments->get($row->id) ?? collect())->map(fn (object $file): array => [
                    'id' => $file->id, 'name' => $file->name, 'mime_type' => $file->mime_type, 'size' => $file->size,
                ])->values(),
            ]),
            'orders' => $customer->orders()->orderByDesc('id')->get(['reference', 'category', 'status', 'measurement_id']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        return $this->save($request, new Customer);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        return $this->save($request, $customer);
    }

    private function save(Request $request, Customer $customer): JsonResponse
    {
        $this->staffOnly($request);
        $email = $request->input('email');
        if (is_string($email)) {
            $request->merge(['email' => strtolower(trim($email)) ?: null]);
        }
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'required_without:phone', 'email:rfc', 'max:254', Rule::unique('customers')->ignore($customer)],
            'phone' => ['nullable', 'required_without:email', 'string', 'max:40', 'regex:/^[+\d() .-]+$/', 'regex:/\d/'],
            'account_reference' => ['nullable', 'string', 'max:100', Rule::unique('customers')->ignore($customer)],
        ]);
        $demoName = config('demo.customer_name');
        if (($customer->name === $demoName) !== ($data['name'] === $demoName)) {
            throw ValidationException::withMessages(['name' => 'The demo customer name is reserved.']);
        }

        $exists = $customer->exists;
        try {
            $customer->fill($data)->save();
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['email' => 'This email or account ID is already on a customer record.']);
        }

        return response()->json(['id' => $customer->id], $exists ? 200 : 201);
    }

    public function measure(Request $request, Customer $customer): JsonResponse
    {
        $this->staffOnly($request);
        if ($request->has('payload')) {
            try {
                $payload = json_decode($request->input('payload'), true, 32, JSON_THROW_ON_ERROR);
            } catch (\JsonException|\TypeError) {
                throw ValidationException::withMessages(['payload' => 'The fitting details could not be read.']);
            }
            abort_unless(is_array($payload), 422, 'Choose valid fitting details.');
            $request->merge(Arr::only($payload, ['request_id', 'garment_type', 'measured_on', 'unit', 'values', 'additional_measurements', 'notes']));
        }
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'garment_type' => ['nullable', Rule::in(array_keys(config('fittings.templates')))],
            'measured_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.now('Africa/Accra')->toDateString()],
            'unit' => ['sometimes', Rule::in(['cm', 'in'])],
            'values' => ['present', 'array:'.implode(',', array_keys(self::MEASUREMENTS))],
            'values.*' => ['required', 'numeric', 'min:0.1', 'max:999', 'decimal:0,2'],
            'additional_measurements' => ['sometimes', 'array', 'list', 'max:30'],
            'additional_measurements.*' => ['required', 'array:label,value,group'],
            'additional_measurements.*.label' => ['required', 'string', 'max:80'],
            'additional_measurements.*.value' => ['required', 'numeric', 'min:0.1', 'max:999', 'decimal:0,2'],
            'additional_measurements.*.group' => ['nullable', 'string', 'max:80'],
            'attachments' => ['sometimes', 'array', 'list', 'max:6'],
            'attachments.*' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm', 'max:20480'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $custom = $data['additional_measurements'] ?? [];
        if (count($data['values']) + count($custom) === 0) {
            throw ValidationException::withMessages(['values' => 'Enter at least one measurement.']);
        }
        $labels = array_map(fn (string $key): string => Str::lower(self::MEASUREMENTS[$key]), array_keys($data['values']));
        foreach ($custom as $index => &$row) {
            $row['label'] = trim($row['label']);
            $label = Str::lower($row['label']);
            if ($label === '' || in_array($label, $labels, true)) {
                throw ValidationException::withMessages(["additional_measurements.$index.label" => 'Give each additional measurement a distinct label.']);
            }
            $labels[] = $label;
        }
        unset($row);
        $files = $request->file('attachments', []);
        if (array_sum(array_map(fn ($file): int => $file->getSize(), $files)) > 60 * 1024 * 1024) {
            throw ValidationException::withMessages(['attachments' => 'Keep the photos and videos under 60 MB in total.']);
        }
        // Keep a single centimetre source for existing Office and order consumers.
        $unit = $data['unit'] ?? 'cm';
        $convert = fn ($value): float => round((float) $value * ($unit === 'in' ? 2.54 : 1), 4);
        $values = [];
        foreach ($data['values'] as $key => $value) {
            $values[$key] = $key === 'weight' ? (float) $value : $convert($value);
        }
        $custom = array_map(fn (array $row): array => [...$row, 'value' => $convert($row['value'])], $custom);
        $paths = [];
        try {
            $id = DB::transaction(function () use ($customer, $data, $values, $custom, $unit, $files, &$paths): int {
                DB::table('customers')->where('id', $customer->id)->lockForUpdate()->first();
                $existing = DB::table('customer_measurements')->where('request_id', $data['request_id'])->first();
                if ($existing) {
                    abort_unless($existing->customer_id === $customer->id, 409, 'This fitting request is already associated with another customer.');

                    return $existing->id;
                }
                $id = DB::table('customer_measurements')->insertGetId([
                    'request_id' => $data['request_id'], 'customer_id' => $customer->id,
                    'measured_on' => $data['measured_on'], 'values' => json_encode($values, JSON_THROW_ON_ERROR),
                    'garment_type' => $data['garment_type'] ?? null, 'recorded_unit' => $unit,
                    'additional_measurements' => json_encode($custom, JSON_THROW_ON_ERROR),
                    'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now(),
                ]);
                foreach ($files as $file) {
                    $uuid = (string) Str::uuid();
                    $path = $file->storeAs("$customer->id/$id", $uuid.'.'.$file->guessExtension(), 'fittings');
                    $paths[] = $path;
                    DB::table('fitting_attachments')->insert([
                        'id' => $uuid, 'measurement_id' => $id, 'path' => $path,
                        'name' => Str::limit(basename($file->getClientOriginalName()), 175, ''),
                        'mime_type' => $file->getMimeType(), 'size' => $file->getSize(),
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                }

                return $id;
            });
        } catch (\Throwable $exception) {
            Storage::disk('fittings')->delete($paths);
            throw $exception;
        }

        return response()->json(['id' => $id], 201);
    }

    public function attachment(Request $request, Customer $customer, int $measurement, string $attachment): BinaryFileResponse
    {
        $this->staffOnly($request);
        $file = DB::table('fitting_attachments')->join('customer_measurements', 'customer_measurements.id', '=', 'fitting_attachments.measurement_id')
            ->where('fitting_attachments.id', $attachment)->where('measurement_id', $measurement)
            ->where('customer_measurements.customer_id', $customer->id)->first(['fitting_attachments.path', 'mime_type']);
        abort_unless($file && Storage::disk('fittings')->exists($file->path), 404);

        return response()->file(Storage::disk('fittings')->path($file->path), [
            'Content-Type' => $file->mime_type, 'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff', 'Content-Disposition' => 'inline',
        ]);
    }

    private function staffOnly(Request $request): void
    {
        StaffAccess::requireStaffToken($request);
    }
}
