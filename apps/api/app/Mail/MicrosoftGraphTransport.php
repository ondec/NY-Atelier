<?php

namespace App\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;

/**
 * Sends mail through Microsoft Graph over HTTPS (Render Free blocks SMTP ports). The Entra application must be
 * granted Mail.Send scoped to the sender mailbox with Exchange Online Application RBAC. A 202 response means
 * Microsoft accepted the message, not that it was delivered.
 */
class MicrosoftGraphTransport extends AbstractTransport
{
    public function __construct(private string $tenantId, private string $clientId, private string $clientSecret, private string $sender)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $mime = MessageConverter::toEmail($message->getOriginalMessage())->toString();
        $response = Http::withToken($this->accessToken())->timeout(15)
            ->withBody(base64_encode($mime), 'text/plain')
            ->post('https://graph.microsoft.com/v1.0/users/'.rawurlencode($this->sender).'/sendMail');
        if ($response->failed()) {
            throw new RuntimeException('Microsoft Graph sendMail failed ('.$response->status().'): '
                .$response->json('error.code', '').' '.Str::limit((string) $response->json('error.message', ''), 300));
        }
    }

    private function accessToken(): string
    {
        $key = 'microsoft-graph-token:'.hash('sha256', $this->tenantId.'|'.$this->clientId);

        return Cache::remember($key, now()->addMinutes(50), function (): string {
            $response = Http::asForm()->timeout(15)
                ->post('https://login.microsoftonline.com/'.rawurlencode($this->tenantId).'/oauth2/v2.0/token', [
                    'grant_type' => 'client_credentials', 'client_id' => $this->clientId, 'client_secret' => $this->clientSecret,
                    'scope' => 'https://graph.microsoft.com/.default',
                ]);
            if ($response->failed() || ! is_string($response->json('access_token'))) {
                // Microsoft's error code/description never contains the secret; it names the cause (e.g. AADSTS7000215).
                throw new RuntimeException('Microsoft sign-in for mail failed ('.$response->status().'): '
                    .$response->json('error', '').' '.Str::limit((string) $response->json('error_description', ''), 300));
            }

            return $response->json('access_token');
        });
    }

    public function __toString(): string
    {
        return 'microsoft-graph';
    }
}
