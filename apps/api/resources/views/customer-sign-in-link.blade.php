<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Sign in · NY Atelier</title>
<style>
  :root { --petrol:#123c45; --silk:#f6f3ec; --cognac:#a85c32; --brass:#c5a059; --muted:#5f6d69; }
  * { box-sizing:border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px 16px; background:var(--silk); color:var(--petrol); font:16px/1.55 "Josefin Sans", system-ui, -apple-system, sans-serif; }
  main { width:100%; max-width:420px; background:#fff; border-radius:24px; padding:36px 28px; text-align:center; box-shadow:0 18px 50px rgba(18,60,69,.08); }
  .mark { width:54px; height:54px; margin:0 auto 22px; border-radius:50%; border:1.5px solid var(--brass); display:grid; place-items:center; font-weight:700; letter-spacing:.06em; color:var(--brass); }
  .eyebrow { margin:0 0 10px; color:var(--cognac); font-size:12px; font-weight:700; letter-spacing:.2em; }
  h1 { margin:0 0 12px; font-family:"Alfa Slab One", Georgia, serif; font-weight:400; font-size:30px; line-height:1.15; }
  p { margin:0 0 22px; color:var(--muted); }
  a.button { display:block; padding:16px 22px; border-radius:999px; background:var(--petrol); color:#fff; text-decoration:none; font-weight:700; letter-spacing:.14em; font-size:13px; }
  small { display:block; margin-top:20px; color:var(--muted); font-size:13px; }
</style>
</head>
<body>
<main>
  <div class="mark" aria-hidden="true">NY</div>
  @if ($appUrl)
    <p class="eyebrow">SIGN IN</p>
    <h1>Opening the NY Atelier app…</h1>
    <p>Open this link on the phone that has the NY Atelier app.</p>
    <a class="button" href="{{ $appUrl }}">OPEN THE APP</a>
    <small>If the app does not open, enter the 6-digit code from the email in the app instead.</small>
    <script>window.location.replace(@json($appUrl));</script>
  @else
    <p class="eyebrow">SIGN IN</p>
    <h1>This link is not complete.</h1>
    <p>Open the latest sign-in email and tap the button again, or enter the 6-digit code in the app.</p>
  @endif
</main>
</body>
</html>
