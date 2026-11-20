import type {SaleLine} from './studio-sales';
export type SaleDraft = {lines: SaleLine[]; customerId?: number; updatedAt: number};
export const saleDraftKey = (staffId: number) => `ny-studio-sale-draft-v1:${staffId}`;
const lifetime = 8 * 60 * 60 * 1000;
export function readSaleDraft(raw: string | null, now = Date.now()): SaleDraft | undefined {
  try {
    const draft = JSON.parse(raw ?? 'null');
    if (!draft || !Number.isFinite(draft.updatedAt) || now < draft.updatedAt || now - draft.updatedAt > lifetime || !Array.isArray(draft.lines) || !draft.lines.length || draft.lines.length > 200) return;
    const ids = new Set<string>();
    const lines: SaleLine[] = [];
    for (const line of draft.lines) {
      if (typeof line.variantId !== 'string' || !line.variantId.trim() || line.variantId.length > 150 || ids.has(line.variantId) || !Number.isSafeInteger(line.quantity) || line.quantity < 1) return;
      ids.add(line.variantId); lines.push({variantId: line.variantId, quantity: line.quantity});
    }
    const customerId = Number.isSafeInteger(draft.customerId) && draft.customerId > 0 ? draft.customerId : undefined;
    return {lines, customerId, updatedAt: draft.updatedAt};
  } catch {return;}
}
