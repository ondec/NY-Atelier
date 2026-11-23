<?php

use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\CustomerPasskeyController;
use App\Http\Controllers\DemoConsultationController;
use App\Http\Controllers\DemoCustomerController;
use App\Http\Controllers\DemoOrderWorkflowController;
use App\Http\Controllers\DemoSalaryController;
use App\Http\Controllers\DemoStaffOrderController;
use App\Http\Controllers\DemoStudioSaleController;
use App\Http\Controllers\DemoTeamController;
use App\Http\Controllers\FinanceOverviewController;
use App\Http\Controllers\OwnerOverviewController;
use App\Http\Controllers\StaffAuthController;
use App\Models\Customer;
use App\Models\Order;
use App\OrderWorkflow;
use App\StaffAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

$listOrders = function (Request $request, OrderWorkflow $workflow) {
    $staff = $request->routeIs('demo.staff.order-list');
    // The staff list is protected by its staff token and gates; the customer demo list only exists in demo mode.
    $staff ? StaffAccess::requireStaffToken($request) : abort_unless(config('demo.enabled'), 404);
    $demoId = Customer::query()->where('name', config('demo.customer_name'))->oldest('id')->value('id');
    $orders = Order::query()
        ->when(! $staff, fn ($query) => $query->where('customer_id', $demoId))
        ->with(['customer', 'items', 'events'])
        ->orderByRaw('completed_at IS NOT NULL')
        ->orderBy('reference')
        ->get()
        ->map(fn (Order $order) => $workflow->serialize($order, $staff && $request->user()->can('staff.orders.manage')));

    return response()->json(['demo' => true, 'orders' => $orders]);
};

Route::get('/demo/orders', $listOrders);
Route::prefix('customer/auth')->group(function () {
    Route::post('/start', [CustomerAuthController::class, 'start'])->middleware('throttle:10,1');
    Route::post('/verify', [CustomerAuthController::class, 'verify'])->middleware('throttle:30,1');
    Route::post('/passkey/login/options', [CustomerPasskeyController::class, 'loginOptions'])->middleware('throttle:20,1');
    Route::post('/passkey/login', [CustomerPasskeyController::class, 'login'])->middleware('throttle:20,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [CustomerAuthController::class, 'me']);
        Route::patch('/me', [CustomerAuthController::class, 'update'])->middleware('throttle:30,1');
        Route::post('/logout', [CustomerAuthController::class, 'logout']);
        Route::get('/passkeys', [CustomerPasskeyController::class, 'index']);
        Route::post('/passkeys/options', [CustomerPasskeyController::class, 'registrationOptions'])->middleware('throttle:20,1');
        Route::post('/passkeys', [CustomerPasskeyController::class, 'store'])->middleware('throttle:20,1');
        Route::delete('/passkeys/{id}', [CustomerPasskeyController::class, 'destroy'])->whereNumber('id')->middleware('throttle:20,1');
    });
});
Route::prefix('staff/auth')->group(function () {
    Route::post('/login', [StaffAuthController::class, 'login'])->middleware('throttle:30,1');
    Route::post('/activation', [StaffAuthController::class, 'activation'])->middleware('throttle:30,1');
    Route::post('/activate', [StaffAuthController::class, 'activate'])->middleware('throttle:10,1');
    Route::get('/me', [StaffAuthController::class, 'me'])->middleware(['auth:sanctum', 'can:staff.studio']);
    Route::post('/logout', [StaffAuthController::class, 'logout'])->middleware('auth:sanctum');
});
Route::get('/demo/size-chart-collections', function () {
    $payload = DB::table('studio_catalogues')->where('id', 1)->value('payload');

    return response()->json(['collections' => collect(json_decode($payload ?? '{}', true)['collections'] ?? [])->map(fn ($row) => ['id' => $row['id'], 'productIds' => $row['productIds']])]);
});
Route::prefix('demo/consultations')->group(function () {
    Route::get('/', [DemoConsultationController::class, 'index']);
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/', [DemoConsultationController::class, 'store']);
        Route::patch('/{id}/staff', [DemoConsultationController::class, 'staff'])->whereUuid('id')->middleware(['auth:sanctum', 'can:staff.consultations']);
        Route::patch('/{id}/customer', [DemoConsultationController::class, 'customer'])->whereUuid('id');
    });
});
// Customer records are the only staff area open to the restricted customer-records role; everything else
// below still requires NY Office access, and Studio sales additionally require the sales permission.
Route::prefix('demo/staff/customers')->middleware(['auth:sanctum', 'can:staff.customers'])->group(function () {
    Route::get('/', [DemoCustomerController::class, 'index']);
    Route::get('/{customer}', [DemoCustomerController::class, 'show'])->whereNumber('customer');
    Route::get('/{customer}/measurements/{measurement}/attachments/{attachment}', [DemoCustomerController::class, 'attachment'])
        ->whereNumber('customer')->whereNumber('measurement')->whereUuid('attachment');
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/', [DemoCustomerController::class, 'store']);
        Route::patch('/{customer}', [DemoCustomerController::class, 'update'])->whereNumber('customer');
        Route::post('/{customer}/measurements', [DemoCustomerController::class, 'measure'])->whereNumber('customer');
    });
});
Route::prefix('demo/staff')->middleware(['auth:sanctum', 'can:staff.office'])->group(function () use ($listOrders) {
    Route::get('/overview', OwnerOverviewController::class)->middleware('can:staff.owner-overview');
    Route::get('/finances/overview', FinanceOverviewController::class)->middleware('can:staff.finances');
    Route::get('/orders', $listOrders)->name('demo.staff.order-list')->middleware('can:staff.orders.read');
    Route::get('/orders/options', [DemoStaffOrderController::class, 'options'])->middleware('can:staff.orders.read');
    Route::get('/orders/{reference}', [DemoOrderWorkflowController::class, 'show'])->middleware('can:staff.orders.read');
    Route::patch('/orders/{reference}/workflow', [DemoOrderWorkflowController::class, 'update'])->middleware(['can:staff.orders.manage', 'throttle:60,1']);
    Route::post('/orders', [DemoStaffOrderController::class, 'store'])->middleware('throttle:30,1');
    Route::get('/consultations', [DemoConsultationController::class, 'index'])->middleware('can:staff.consultations');
    Route::prefix('salaries')->middleware('can:staff.finances')->group(function () {
        Route::get('/', [DemoSalaryController::class, 'index']);
        Route::get('/{id}', [DemoSalaryController::class, 'show'])->whereUuid('id');
        Route::post('/', [DemoSalaryController::class, 'store'])->middleware('throttle:30,1');
        Route::patch('/{id}', [DemoSalaryController::class, 'update'])->whereUuid('id')->middleware('throttle:60,1');
    });
    Route::prefix('team')->middleware('can:staff.team')->group(function () {
        Route::get('/', [DemoTeamController::class, 'index']);
        Route::post('/invitations', [DemoTeamController::class, 'invite'])->middleware('throttle:20,1');
        Route::post('/{member}/invitation', [DemoTeamController::class, 'resend'])->whereNumber('member')->middleware('throttle:20,1');
        Route::patch('/{member}/role', [DemoTeamController::class, 'role'])->whereNumber('member')->middleware('throttle:30,1');
        Route::post('/{member}/deactivate', [DemoTeamController::class, 'deactivate'])->whereNumber('member')->middleware('throttle:30,1');
        Route::post('/{member}/reactivate', [DemoTeamController::class, 'reactivate'])->whereNumber('member')->middleware('throttle:30,1');
    });
    Route::prefix('studio')->middleware(['can:staff.studio', 'can:staff.sales'])->group(function () {
        Route::post('/orders', [DemoStaffOrderController::class, 'store'])->name('demo.staff.studio.order-create')->middleware('throttle:30,1');
        Route::get('/catalogue', [DemoStudioSaleController::class, 'catalogue']);
        Route::post('/catalogue/initialize', [DemoStudioSaleController::class, 'initialize'])->middleware('can:staff.catalogue.manage');
        Route::post('/catalogue', [DemoStudioSaleController::class, 'saveCatalogue'])->middleware('can:staff.catalogue.manage');
        Route::get('/sales', [DemoStudioSaleController::class, 'index']);
        Route::get('/sales/{id}', [DemoStudioSaleController::class, 'show'])->whereUuid('id');
        Route::post('/sales/quote', [DemoStudioSaleController::class, 'quote']);
        Route::post('/sales', [DemoStudioSaleController::class, 'store'])->middleware('throttle:30,1');
    });
});
