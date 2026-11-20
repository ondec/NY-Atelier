<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DemoTeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(config('demo.enabled') && in_array($request->ip(), ['127.0.0.1', '::1'], true), 404);

        return response()->json(['members' => DB::table('staff_members')->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'name', 'job_title', 'salary_eligible', 'user_id'])
            ->map(fn (object $member): array => [
                'id' => $member->id, 'name' => $member->name, 'job_title' => $member->job_title,
                'salary_eligible' => (bool) $member->salary_eligible, 'has_account' => $member->user_id !== null,
            ])]);
    }
}
