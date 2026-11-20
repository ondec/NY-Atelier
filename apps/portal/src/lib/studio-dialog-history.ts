type PanelState = Record<string, unknown> & {studioPanels?: string[]};
type HistoryHost = {
  history: {state: unknown; pushState: (state: unknown, unused: string, url?: string) => void; back: () => void};
  location: {href: string};
  addEventListener: (type: 'popstate', listener: () => void) => void;
  removeEventListener: (type: 'popstate', listener: () => void) => void;
};
const pendingReturns = new WeakMap<HistoryHost, Promise<void>>();
let sequence = 0;
const stateOf = (host: HistoryHost): PanelState => host.history.state && typeof host.history.state === 'object' ? host.history.state as PanelState : {};
const panelsOf = (host: HistoryHost) => Array.isArray(stateOf(host).studioPanels) ? stateOf(host).studioPanels!.filter(item => typeof item === 'string') : [];

export function leaveStudioDialog(host: HistoryHost, next: () => void) {
  if (!panelsOf(host).length) {next(); return;}
  const returned = () => {host.removeEventListener('popstate', returned); queueMicrotask(next);};
  host.addEventListener('popstate', returned);
  host.history.back();
}

// A panel consumes one browser-history entry. Nested panels return to their parent.
export function attachStudioDialogHistory(host: HistoryHost, onBack: () => void, blocked: () => boolean = () => false) {
  const id = `studio-panel-${++sequence}`;
  let active = true;
  let attached = false;
  let returned = false;
  let href = '';
  let entry: PanelState = {};
  const pop = () => {
    if (!active || panelsOf(host).includes(id)) return;
    if (blocked()) {host.history.pushState(entry, '', href); return;}
    returned = true;
    onBack();
  };
  const attach = () => {
    if (!active) return;
    href = host.location.href;
    entry = {...stateOf(host), studioPanels: [...panelsOf(host), id]};
    host.history.pushState(entry, '', href);
    host.addEventListener('popstate', pop);
    attached = true;
  };
  const pending = pendingReturns.get(host);
  if (pending) void pending.then(attach); else attach();
  return () => {
    active = false;
    host.removeEventListener('popstate', pop);
    if (!attached || returned || panelsOf(host).at(-1) !== id || host.location.href !== href) return;
    // Wait for an outgoing panel's Back before registering its replacement.
    const returning = new Promise<void>(resolve => {
      const done = () => {host.removeEventListener('popstate', done); resolve();};
      host.addEventListener('popstate', done);
    });
    pendingReturns.set(host, returning);
    void returning.then(() => {if (pendingReturns.get(host) === returning) pendingReturns.delete(host);});
    host.history.back();
  };
}
