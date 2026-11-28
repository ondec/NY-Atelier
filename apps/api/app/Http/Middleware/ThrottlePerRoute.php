<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;

/**
 * Laravel's "throttle:N,M" counts every throttled route for a visitor (or signed-in user) in one shared bucket,
 * so browsing pages could use up the sign-in or booking limit. This keeps a separate count per route.
 */
class ThrottlePerRoute extends ThrottleRequests
{
    /** @param  Request  $request */
    protected function resolveRequestSignature($request): string
    {
        $route = $request->route();

        return parent::resolveRequestSignature($request).'|'.implode(',', $route?->methods() ?? []).' '.($route?->uri() ?? '');
    }
}
