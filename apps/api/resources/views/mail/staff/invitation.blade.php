<x-mail::message>
<x-mail::kicker>Your staff account</x-mail::kicker>

# Welcome to NY Atelier, {{ $name }}.

You’ve been given a staff account with **{{ $roleLabel }}** access. Choose your own password to finish setting it up.

<x-mail::button :url="$setupUrl">
Set up my account
</x-mail::button>

<x-mail::details :rows="['Access' => $roleLabel, 'Link expires' => $expiresAt->timezone('Africa/Accra')->format('j F Y, H:i').' (Accra)']" />

<x-mail::note>This link works once. If it has expired, ask the owner for a new invitation. If you weren’t expecting this email, you can ignore it and no account will be activated.</x-mail::note>

<x-mail::signature />
</x-mail::message>
