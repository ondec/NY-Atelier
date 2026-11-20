export type AccountFitting = { id: number; date: string; values: Record<string, string>; editSession?: string };
export const fittingsKey = 'ny-atelier-demo-account-fittings-v1';
export const accountMeasurementFields = [
  ['height', 'Height'], ['weight', 'Weight'], ['neck', 'Neck'], ['shoulder', 'Shoulder width'], ['chest', 'Chest'], ['bust', 'Bust'],
  ['waist', 'Waist'], ['hips', 'Hips'], ['sleeve', 'Sleeve length'], ['arm', 'Upper arm'], ['wrist', 'Wrist'],
  ['top_length', 'Top length'], ['inseam', 'Inside-leg length'], ['outseam', 'Outseam'], ['thigh', 'Thigh'],
] as const;
export const sizingAccountKeys = { chest: 'chest', bust: 'bust', waist: 'waist', hip: 'hips', shoulder: 'shoulder', sleeveLength: 'sleeve', shirtLength: 'top_length', inseam: 'inseam', outseam: 'outseam' } as const;
const known = new Set<string>(accountMeasurementFields.map(([key]) => key));
function valid(key: string, value: unknown): value is string {
  return known.has(key) && typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= 0.1 && Number(value) <= 999;
}
export function parseMeasurementHistory(raw: string | null): AccountFitting[] {
  if (!raw) return [];
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('Invalid measurement history.');
  return rows.flatMap(row => {
    if (!row || !Number.isFinite(row.id) || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !row.values || typeof row.values !== 'object' || Array.isArray(row.values)) return [];
    const values = Object.fromEntries(Object.entries(row.values).filter(([key, value]) => valid(key, value))) as Record<string, string>;
    return [{ id: row.id, date: row.date, values, ...(typeof row.editSession === 'string' ? { editSession: row.editSession } : {}) }];
  });
}
// Canonical values are centimetres (weight remains kg). Updating a product form
// coalesces its edits into one record, preserving the previous fitting snapshots.
export function updateMeasurementHistory(history: AccountFitting[], patch: Record<string, string>, options: { replace?: boolean; editSession?: string; now?: number } = {}): AccountFitting[] {
  if (!Object.keys(patch).length || Object.entries(patch).some(([key, value]) => !valid(key, value))) throw new Error('Enter valid measurements before saving.');
  const values = options.replace ? { ...patch } : { ...history[0]?.values, ...patch };
  const previous = history[0]?.values ?? {};
  if (Object.keys(values).length === Object.keys(previous).length && Object.entries(values).every(([key, value]) => previous[key] === value)) return history;
  const now = options.now ?? Date.now();
  const sameSession = options.editSession && history[0]?.editSession === options.editSession;
  const row: AccountFitting = {
    id: sameSession ? history[0].id : Math.max(now, ...history.map(item => item.id + 1)),
    date: new Date(now).toISOString().slice(0, 10), values,
    ...(options.editSession ? { editSession: options.editSession } : {}),
  };
  return [row, ...(sameSession ? history.slice(1) : history)];
}
