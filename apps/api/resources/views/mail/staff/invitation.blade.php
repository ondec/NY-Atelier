<x-mail::message>
# Welcome to NY Atelier, {{ $name }}

You have been given a staff account with **{{ $roleLabel }}** access.

Choose your own password to finish setting up your account.

<x-mail::button :url="$setupUrl">
Set up my account
</x-mail::button>

This link works once and expires on {{ $expiresAt->timezone('Africa/Accra')->format('j F Y \a\t H:i') }} (Accra time). If it has expired, ask the owner for a new invitation.

If you were not expecting this email, you can ignore it. No account will be activated.

NY Atelier
</x-mail::message>
