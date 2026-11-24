<?php

namespace App\Http\Controllers;

use App\PublicShopCatalogue;
use App\StudioSales;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ShopCatalogueController extends Controller
{
    public function index(StudioSales $sales, PublicShopCatalogue $publicCatalogue): JsonResponse
    {
        $row = $sales->catalogue();
        if (! $row) {
            return response()->json(['revision' => 0, 'currency' => 'GHS', 'products' => [], 'collections' => [], 'promotions' => []]);
        }

        $catalogue = Cache::remember('shop-catalogue-v4-'.$row->revision, 300, fn (): array => $publicCatalogue->serialize(json_decode($row->payload, true), (int) $row->revision));

        return response()->json($catalogue)->header('Cache-Control', 'no-cache');
    }
}
