// Links to other local preview servers (127.0.0.1:3000/:3002) only make sense on the developer's Mac.
// They stay hidden unless this server-only flag is set, so they never appear on a hosted site.
export function layoutComparisonLinksEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NY_LAYOUT_COMPARISON_LINKS === "1";
}
