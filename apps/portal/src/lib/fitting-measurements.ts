export type MeasurementUnit = 'cm' | 'in';
export type AdditionalMeasurement = {label: string; value: number; group?: string | null};
/** An extra garment piece measured in the same fitting, e.g. a shirt with a suit. Values are in centimetres. */
export type FittingPiece = {key: string; title: string; values: Record<string, number>};
/** Pieces staff can add: a fixed title and its usual fields, or `custom` (named by staff, own readings only). */
export type PieceOption = {title: string | null; fields: string[]};
export type FittingAttachment = {id: string; name: string; mime_type: string; size: number};
type ReadingGroup = {title: string; readings: {id: string; label: string; value: number; key?: string}[]};

export function groupFittingReadings(
  fitting: {garment_type?: string | null; values: Record<string, number>; additional_measurements?: AdditionalMeasurement[]; pieces?: FittingPiece[]},
  fields: Record<string, string>,
  template?: {groups: {title: string; fields: string[]}[]},
) {
  const groups: ReadingGroup[] = (template?.groups ?? []).map(group => ({title: group.title, readings: []}));
  function groupFor(title: string) {
    let group = groups.find(row => row.title.toLowerCase() === title.toLowerCase());
    if (!group) {group = {title, readings: []}; groups.push(group);}
    return group;
  }
  for (const [key, value] of Object.entries(fitting.values)) {
    // A suit's seat/hip circumference is displayed with its trouser readings.
    const trousers = fitting.garment_type === 'suit' && key === 'hips'
      ? template?.groups.find(group => group.fields.includes('trouser_waist')) : undefined;
    const title = (trousers ?? template?.groups.find(group => group.fields.includes(key)))?.title
      ?? (template ? 'Other measurements' : 'Measurements');
    groupFor(title).readings.push({id: key, key, label: fields[key] ?? key, value});
  }
  fitting.pieces?.forEach((piece, pieceIndex) => {
    const group = groupFor(piece.title);
    for (const [key, value] of Object.entries(piece.values)) group.readings.push({id: `piece-${pieceIndex}-${key}`, key, label: fields[key] ?? key, value});
  });
  fitting.additional_measurements?.forEach((reading, index) => {
    groupFor(reading.group?.trim() || 'Other measurements').readings.push({
      id: `additional-${index}`, label: reading.label, value: reading.value,
    });
  });
  return groups.filter(group => group.readings.length);
}
export const fittingUploadLimits = {files: 6, fileBytes: 20 * 1024 * 1024, totalBytes: 60 * 1024 * 1024};

export function measurementValue(value: number, unit: MeasurementUnit, key = '') {
  return Number((unit === 'in' && key !== 'weight' ? value / 2.54 : value).toFixed(2));
}
export function measurementUnit(unit: MeasurementUnit, key = '') {
  return key === 'weight' ? 'kg' : unit;
}
export function fittingMediaUrl(customerId: number, fittingId: number, attachmentId: string) {
  return `/api/staff-fitting-media/${customerId}/${fittingId}/${encodeURIComponent(attachmentId)}`;
}
export function fittingFormValues(form: FormData, fields: Record<string, string>) {
  const values = Object.fromEntries(Object.keys(fields).flatMap(key => {
    const value = form.get(key);
    return typeof value === 'string' && value.trim() !== '' ? [[key, Number(value)]] : [];
  }));
  const labels = form.getAll('additional_label');
  const readings = form.getAll('additional_value');
  const groups = form.getAll('additional_group');
  const keys = form.getAll('piece_key');
  const titles = form.getAll('piece_title');
  const pieces = form.getAll('piece_id').map((id, index) => ({
    key: String(keys[index]), title: String(titles[index] ?? '').trim(),
    values: Object.fromEntries(Object.keys(fields).flatMap(key => {
      const value = form.get(`piece-${id}-${key}`);
      return typeof value === 'string' && value.trim() !== '' ? [[key, Number(value)]] : [];
    })),
  }));
  return {values, pieces, additional_measurements: labels.map((label, index) => ({
    label: String(label).trim(), value: Number(readings[index]), group: String(groups[index] ?? ''),
  }))};
}
