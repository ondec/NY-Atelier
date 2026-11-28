<?php

namespace App\Http\Controllers;

use App\StaffAccess;
use App\StudioSales;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DemoStudioSaleController extends Controller
{
    public function catalogue(Request $request, StudioSales $sales): JsonResponse
    {
        $this->requireStaff($request);
        $row = $sales->catalogue();

        return response()->json($row ? $sales->serializeCatalogue($row) : ['initialized' => false]);
    }

    public function initialize(Request $request, StudioSales $sales): JsonResponse
    {
        $this->requireStaff($request);
        $data = $this->validateCatalogue($request);
        DB::table('studio_catalogues')->insertOrIgnore(['id' => 1, 'payload' => json_encode($data), 'revision' => 1, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json($sales->serializeCatalogue($sales->catalogue()));
    }

    public function saveCatalogue(Request $request, StudioSales $sales): JsonResponse
    {
        $this->requireStaff($request);
        $revision = $request->validate(['revision' => ['required', 'integer', 'min:1']])['revision'];
        $data = $this->validateCatalogue($request);
        $result = DB::transaction(function () use ($revision, $data, $sales): array {
            $row = $sales->catalogue(true);
            abort_unless($row && (int) $row->revision === (int) $revision, 409, 'The catalogue changed on another device. Reload the shared catalogue before editing again.');
            DB::table('studio_catalogues')->where('id', 1)->update(['payload' => json_encode($data), 'revision' => $row->revision + 1, 'updated_at' => now()]);

            return $sales->serializeCatalogue($sales->catalogue());
        });

        return response()->json($result);
    }

    public function quote(Request $request, StudioSales $sales): JsonResponse
    {
        $this->requireStaff($request);

        return response()->json($sales->quote($request->validate($this->lineRules())));
    }

    public function store(Request $request, StudioSales $sales): JsonResponse
    {
        $this->requireStaff($request);
        $data = $request->validate([
            ...$this->lineRules(),
            'request_id' => ['required', 'uuid'], 'revision' => ['required', 'integer', 'min:1'],
            'total_minor' => ['required', 'integer', 'min:1', 'max:99999999999'],
            'payment_method' => ['required', Rule::in(['cash', 'mobile-money', 'card', 'bank-transfer'])],
            'payment_reference' => ['nullable', 'required_unless:payment_method,cash', 'string', 'min:3', 'max:100'],
            'tendered_minor' => ['required_if:payment_method,cash', 'nullable', 'integer', 'min:0', 'max:99999999999'],
            'payment_confirmed' => ['required', 'accepted'],
            'handover' => ['required', Rule::in(['take-away', 'collection', 'delivery'])],
            'handover_confirmed' => ['nullable', 'boolean'],
            'instructions' => ['nullable', 'required_if:handover,delivery', 'string', 'max:1000'],
        ]);
        $altering = collect($data['lines'])->contains(fn (array $line): bool => filled($line['alteration'] ?? null));
        if ($altering && $data['handover'] === 'take-away') {
            throw ValidationException::withMessages(['handover' => 'A piece that needs altering can’t be taken away today. Choose collection or delivery.']);
        }
        if ($data['handover'] === 'take-away' && ! ($data['handover_confirmed'] ?? false)) {
            throw ValidationException::withMessages(['handover_confirmed' => 'Confirm the garments were checked and handed to the customer.']);
        }
        try {
            $result = $sales->complete($data, $request->user());
        } catch (UniqueConstraintViolationException) {
            abort(409, 'This payment or checkout is already recorded. Review the original receipt before trying again.');
        }

        return response()->json($result, $result['replayed'] ? 200 : 201);
    }

    public function index(Request $request): JsonResponse
    {
        $this->requireStaff($request);
        $data = $request->validate(['page' => ['sometimes', 'integer', 'min:1'], 'search' => ['nullable', 'string', 'max:150']]);
        $query = DB::table('studio_sales')->join('orders', 'orders.id', '=', 'studio_sales.order_id')->join('customers', 'customers.id', '=', 'orders.customer_id');
        if (! empty($data['search'])) {
            $needle = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($data['search'])).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(orders.reference) LIKE ?', [$needle])->orWhereRaw('LOWER(customers.name) LIKE ?', [$needle])->orWhereRaw('LOWER(studio_sales.payment_reference) LIKE ?', [$needle]));
        }
        $rows = $query->orderByDesc('studio_sales.created_at')->orderByDesc('studio_sales.id')->select('studio_sales.receipt')->paginate(20);

        return response()->json(['sales' => $rows->getCollection()->map(fn ($row) => json_decode($row->receipt, true)), 'page' => $rows->currentPage(), 'pages' => $rows->lastPage(), 'total' => $rows->total()]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->requireStaff($request);
        $sale = DB::table('studio_sales')->where('id', $id)->first();
        abort_unless($sale, 404, 'No completed sale was found for this checkout.');

        return response()->json(['receipt' => json_decode($sale->receipt, true)]);
    }

    private function lineRules(): array
    {
        return [
            'customer_id' => ['required', 'integer', Rule::exists('customers', 'id')],
            'lines' => ['required', 'array', 'list', 'min:1', 'max:50'],
            'lines.*' => ['required', 'array:variantId,quantity,alteration'],
            'lines.*.alteration' => ['nullable', 'string', 'max:1000'],
            'lines.*.variantId' => ['required', 'string', 'max:150', 'distinct'],
            'lines.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    private function validateCatalogue(Request $request): array
    {
        $data = $request->validate([
            'inventory' => ['required', 'array:products,variants,visuals,movements'],
            'inventory.products' => ['present', 'array', 'list', 'max:10000'],
            'inventory.products.*.id' => ['required', 'string', 'max:150', 'distinct'],
            'inventory.products.*.type' => ['required', 'string', 'max:100'],
            'inventory.products.*.createdAt' => ['sometimes', 'string'],
            'inventory.products.*.catalogueId' => ['sometimes', 'string'],
            'inventory.products.*.wordpressId' => ['sometimes', 'integer', 'min:1'],
            'inventory.products.*.sourceUrl' => ['sometimes', 'url:https', 'max:2000'],
            'inventory.products.*.description' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'inventory.products.*.section' => ['sometimes', 'nullable', 'in:men,women,accessories'],
            'inventory.products.*.isNew' => ['sometimes', 'boolean'],
            'inventory.products.*.newUntil' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'inventory.products.*.offerPrice' => ['sometimes', 'nullable', 'numeric', 'gt:0', 'max:9999999'],
            'inventory.products.*.sizing' => ['sometimes', 'array', 'max:2'],
            'inventory.products.*.sizing.*' => ['in:shirt,trousers', 'distinct'],
            'inventory.products.*.photo' => ['sometimes', 'nullable', 'string'],
            'inventory.products.*.gallery' => ['sometimes', 'array'],
            'inventory.products.*.colours' => ['sometimes', 'array'],
            'inventory.products.*.name' => ['required', 'string', 'max:150'],
            'inventory.products.*.price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999'],
            'inventory.variants' => ['present', 'array', 'list', 'max:50000'],
            'inventory.variants.*.id' => ['required', 'string', 'max:150', 'distinct'],
            'inventory.variants.*.productId' => ['required', 'string', 'max:150'],
            'inventory.variants.*.quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'inventory.variants.*.stockVerified' => ['sometimes', 'boolean'],
            'inventory.variants.*.colour' => ['present', 'nullable', 'string', 'max:100'],
            'inventory.variants.*.fabric' => ['nullable', 'string', 'max:100'],
            'inventory.variants.*.size' => ['required', 'string', 'max:30'],
            'inventory.variants.*.reorderAt' => ['required', 'integer', 'min:0'],
            'inventory.variants.*.location' => ['sometimes', 'nullable', 'string', 'max:150'],
            'inventory.variants.*.sku' => ['required', 'string', 'max:150', 'distinct'],
            'inventory.visuals' => ['sometimes', 'array'],
            'inventory.visuals.*.swatch' => ['sometimes', 'nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'inventory.visuals.*.group' => ['sometimes', 'nullable', 'in:black,blue,light,brown'], 'inventory.movements' => ['present', 'array', 'list'],
            'collections' => ['present', 'array', 'list'],
            ...$this->heroRules('heroes'),
            ...$this->heroRules('heroDrafts'),
        ]);
        foreach ($data['inventory']['variants'] as &$variant) {
            $variant['colour'] ??= '';
            if (! $variant['colour'] && empty($variant['fabric'])) {
                throw ValidationException::withMessages(['inventory.variants' => 'Each variant needs a colour or fabric.']);
            }
        }
        unset($variant);

        return $data;
    }

    /**
     * The hero at the top of the website home, the RTW Store and Services, set in the catalogue manager:
     * `heroes` is what the sites show (published); `heroDrafts` is saved work not yet published.
     *
     * @return array<string, list<string>>
     */
    private function heroRules(string $key): array
    {
        return [
            $key => ['sometimes', 'array:website,rtw,services'],
            "{$key}.*" => ['array'],
            "{$key}.*.use" => ['required', 'in:default,custom'],
            "{$key}.*.style" => ['required', 'in:photos,video'],
            "{$key}.*.media" => ['present', 'array', 'list', 'max:8'],
            "{$key}.*.media.*" => ['string', 'max:3000'],
            "{$key}.*.eyebrow" => ['nullable', 'string', 'max:60'],
            "{$key}.*.title" => ['nullable', 'string', 'max:80'],
            "{$key}.*.text" => ['nullable', 'string', 'max:300'],
            "{$key}.*.buttonLabel" => ['nullable', 'string', 'max:40'],
            "{$key}.*.buttonTo" => ['nullable', 'string', 'max:160', 'regex:/^(services|rtw|appointment|featured|collection:[A-Za-z0-9_-]+)$/'],
            "{$key}.*.featuredId" => ['nullable', 'string', 'max:150'],
        ];
    }

    private function requireStaff(Request $request): void
    {
        StaffAccess::requireStaffToken($request);
    }
}
