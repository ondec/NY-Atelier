import { mkdir, readFile, rename, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { emptyPublishedSizing, sizingProductId, validatePublishedSizing, validateSizingProfile, validateOverrides, type PublishedSizing } from '../../../mobile/src/lib/sizing';

const folder = process.env.NY_SIZE_CHART_DATA_DIR ?? path.join(process.cwd(), '.studio-data');
const file = path.join(folder, 'size-charts.json');
export class SizingConflict extends Error {}
export async function readPublishedSizing(): Promise<PublishedSizing> {
  try { return validatePublishedSizing(JSON.parse(await readFile(file, 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(emptyPublishedSizing); throw error; }
}
export async function saveSizingAssignment(input: unknown): Promise<PublishedSizing> {
  if (!input || typeof input !== 'object') throw new Error('Invalid chart submission.');
  const data = input as Record<string, unknown>;
  if (!['product', 'collection'].includes(String(data.scope)) || typeof data.targetId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/.test(data.targetId)) throw new Error('Choose a garment or collection.');
  if (!['publish', 'default'].includes(String(data.action))) throw new Error('Invalid chart action.');
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const lock = path.join(folder, 'size-chart-lock');
  let locked = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { await mkdir(lock); locked = true; break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; await new Promise(resolve => setTimeout(resolve, 30)); }
  }
  if (!locked) throw new Error('Another chart is being saved. Please try again.');
  try {
    const current = await readPublishedSizing();
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
    current.revision++;
    const next = validatePublishedSizing(current);
    const temporary = `${file}.${crypto.randomUUID()}`;
    await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
    await rename(temporary, file);
    return next;
  } finally { await rmdir(lock); }
}
