import { readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { emptyPublishedSizing, sizingProductId, validatePublishedSizing, validateSizingProfile, validateOverrides, type PublishedSizing } from '../../../mobile/src/lib/sizing';

// Charts are stored in the Laravel database (table size_chart_publications). The old file is only read
// to carry charts over: until the first save, its charts are still shown, and that save moves them across.
const legacyFile = path.join(process.env.NY_SIZE_CHART_DATA_DIR ?? path.join(process.cwd(), '.studio-data'), 'size-charts.json');
const api = () => process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
export class SizingConflict extends Error {}

async function readLegacy(): Promise<PublishedSizing | null> {
  try {
    const data = validatePublishedSizing(JSON.parse(await readFile(legacyFile, 'utf8')));
    return Object.keys(data.products).length || Object.keys(data.collections).length ? data : null;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
async function readStored(): Promise<PublishedSizing> {
  const response = await fetch(`${api()}/api/size-charts`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Size charts are temporarily unavailable.');
  return validatePublishedSizing(await response.json());
}
export async function readPublishedSizing(): Promise<PublishedSizing> {
  const stored = await readStored();
  if (stored.revision > 0) return stored;
  return await readLegacy() ?? structuredClone(emptyPublishedSizing);
}
/** `headers` carry the signed-in staff member's API token (staffBackendHeaders). */
export async function saveSizingAssignment(input: unknown, headers: Record<string, string> = {}): Promise<PublishedSizing> {
  if (!input || typeof input !== 'object') throw new Error('Invalid chart submission.');
  const data = input as Record<string, unknown>;
  if (!['product', 'collection'].includes(String(data.scope)) || typeof data.targetId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(data.targetId)) throw new Error('Choose a garment or collection.');
  if (!['publish', 'default'].includes(String(data.action))) throw new Error('Invalid chart action.');
  const stored = await readStored();
  const legacy = stored.revision > 0 ? null : await readLegacy();
  const current = legacy ?? stored;
  if (data.revision !== current.revision) throw new SizingConflict('Charts have changed in another window. Reload the charts before saving.');
  const key = data.scope === 'product' ? sizingProductId(data.targetId) : data.targetId;
  if (data.action === 'default') {
    if (data.scope === 'product') delete current.products[key]; else delete current.collections[key];
  } else {
    const charts = validateOverrides({ version: '1.0', charts: data.charts });
    const prefix = `staff-${data.scope}-${key}-`;
    if (charts.some(chart => !chart.id.startsWith(prefix) || chart.source !== 'product')) throw new Error('Invalid chart ownership.');
    for (const chart of charts) {
      const dimensions = new Set(chart.rows.flatMap(row => Object.keys(row.measurements)));
      if (chart.measurementType === 'garment' && [...dimensions].some(key => chart.fitAllowance?.[key as keyof typeof chart.fitAllowance] === undefined)) throw new Error('Finished garment charts need an approved fit allowance for every supplied measurement.');
      if (chart.measurementType === 'body' && chart.mode === 'range' && chart.rows.some(row => Object.values(row.measurements).some(value => !Array.isArray(value)))) throw new Error('Body ranges need a minimum and maximum.');
    }
    const profile = validateSizingProfile(data.profile, charts);
    if (data.scope === 'product') current.products[key] = profile;
    else {
      if (!Array.isArray(data.productIds) || data.productIds.some(id => typeof id !== 'string')) throw new Error('Choose collection garments.');
      current.collections[key] = { productIds: data.productIds.map(sizingProductId), profile };
    }
    current.charts = [...current.charts.filter(chart => !charts.some(next => next.id === chart.id)), ...charts];
  }
  const used = new Set([...Object.values(current.products), ...Object.values(current.collections).map(item => item.profile)].flatMap(profile => (profile.parts ?? [profile]).map(part => part.chartId)));
  current.charts = current.charts.filter(chart => used.has(chart.id));
  const next = validatePublishedSizing(current);
  const response = await fetch(`${api()}/api/demo/staff/size-charts`, {
    method: 'PUT', cache: 'no-store', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ revision: stored.revision, publication: next }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 409) throw new SizingConflict(body.message ?? 'Charts have changed in another window. Reload the charts before saving.');
  if (!response.ok) throw new Error(body.message ?? 'Could not save this chart.');
  if (legacy) await rename(legacyFile, `${legacyFile}.moved-to-database`).catch(() => {});
  return validatePublishedSizing(body);
}
