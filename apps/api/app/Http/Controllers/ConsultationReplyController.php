<?php

namespace App\Http\Controllers;

use App\ConsultationNotice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The website's appointment reply page, opened from the "Please choose a time" email.
 * The private token in the link stands in for signing in, so website guests can answer too.
 * Only what the page needs is shown: no contact details, notes or staff fields.
 */
class ConsultationReplyController extends DemoConsultationController
{
    public function view(Request $request, string $id): JsonResponse
    {
        $row = $this->withToken($request, $id);
        $options = $row->status === 'awaiting-customer' ? (json_decode((string) $row->options, true) ?: []) : [];

        return response()->json([
            'id' => $row->id, 'version' => (int) $row->version, 'status' => $row->status,
            'purpose' => $row->purpose, 'method' => $row->method,
            'preferredDate' => $row->preferredDate, 'preferredTime' => $row->preferredTime,
            'confirmedDate' => $row->confirmedDate, 'confirmedTime' => $row->confirmedTime,
            'options' => array_values($options),
        ]);
    }

    public function reply(Request $request, string $id): JsonResponse
    {
        $this->withToken($request, $id);
        $data = $request->validate([
            'action' => ['required', 'in:accept,decline'],
            'version' => ['required', 'integer', 'min:1'],
            'option' => ['required_if:action,accept', 'integer', 'min:0', 'max:2'],
        ]);
        $this->answer($this->current($id, $data['version'], ['awaiting-customer']), $data);

        return $this->view($request, $id);
    }

    private function withToken(Request $request, string $id): object
    {
        $token = (string) $request->input('token', '');
        $row = DB::table('consultations')->where('id', $id)->first();
        abort_unless($row && preg_match('/^[a-f0-9]{64}$/', $token) === 1 && ConsultationNotice::validToken($id, $token), 404, 'This link is not valid. Please contact the atelier.');

        return $row;
    }
}
