export type ScanBlock = { text: string; confidence: number; x: number; y: number; width: number };
export type ScanRow = { name: string; quantity: number | null; amount_minor: number | null; review: boolean };

export function scanAmount(text: string): number | null {
  if (/\d\s+\d/.test(text)) return null;
  const cleaned = text.replace(/(?:GH[₵C¢]?|GHS)/gi, "").replace(/\s/g, "");
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned.replaceAll(",", ""));
  return value >= 0 && value <= 1000000 ? Math.round(value * 100) : null;
}

export function salaryScanRows(blocks: ScanBlock[]): ScanRow[] {
  const header = blocks.find((block) => /^name$/i.test(block.text.trim()));
  if (!header) return [];
  const amountHeader = blocks.find((block) => /amount/i.test(block.text) && Math.abs(block.y - header.y) < .06);
  const slope = amountHeader ? (amountHeader.y - header.y) / ((amountHeader.x + amountHeader.width / 2) - (header.x + header.width / 2)) : 0;
  if (!Number.isFinite(slope) || Math.abs(slope) > .15) return [];
  const alignedY = (block: ScanBlock) => block.y - slope * (block.x + block.width / 2 - header.x - header.width / 2);
  const amountEdge = amountHeader ? Math.max(.65, amountHeader.x - .06) : .73;
  const names = blocks.filter((block) => block.y < header.y - .018 && block.x < .32 && /[a-z]/i.test(block.text) && !/supervised|prepared|signature|total/i.test(block.text)).sort((a, b) => b.y - a.y);
  return names.slice(0, 100).map((name, i) => {
    const previousGap = i > 0 ? Math.abs(names[i - 1].y - name.y) / 2 : .024;
    const nextGap = i + 1 < names.length ? Math.abs(names[i + 1].y - name.y) / 2 : .024;
    const tolerance = Math.min(.024, previousGap, nextGap);
    const row = blocks.filter((block) => block !== name && Math.abs(alignedY(block) - alignedY(name)) < tolerance);
    const output = row.filter((block) => block.x >= .32 && block.x < amountEdge).sort((a, b) => a.x - b.x);
    const amount = row.filter((block) => block.x >= amountEdge).sort((a, b) => a.x - b.x);
    const quantityText = output.map((block) => block.text).join(" ").trim();
    const amountText = amount.map((block) => block.text).join(" ").trim();
    const quantity = /^\d{1,5}$/.test(quantityText) ? Number(quantityText) : null;
    const amount_minor = scanAmount(amountText);
    return { name: name.text.trim(), quantity, amount_minor, review: name.confidence < .85 || [...output, ...amount].some((block) => block.confidence < .85) || amount_minor === null || quantity === null };
  });
}
