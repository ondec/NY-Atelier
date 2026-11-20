import vectors from './ny-icons.json';

export type IconName = keyof typeof vectors;
export type IconElement = { tag: string; attrs: Record<string, string>; children: IconElement[] };
export type IconDefinition = IconElement & { source: { kind: string; name: string; nodeId?: string } };
export const iconDefinitions = vectors as unknown as Record<IconName, IconDefinition>;
export const ICON_STROKE_WIDTH = 2.25;
export function iconElementAttributes(node: IconElement, strokeWidth: number | string = ICON_STROKE_WIDTH): Record<string, string> {
  // Some Figma outlines are exported as filled, one-unit-wide paths.
  // Widen those outlines too, so they match the editable SVG strokes.
  if (node.attrs.fill === 'currentColor' && !node.attrs.stroke) {
    return { ...node.attrs, stroke: 'currentColor', 'stroke-width': String(Math.max(Number(strokeWidth) - 1, 0)) };
  }
  return node.attrs;
}
export function getIconDefinition(name: IconName): IconDefinition {
  return iconDefinitions[name];
}
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function iconSvg(name: IconName, strokeWidth = ICON_STROKE_WIDTH): string {
  const definition = getIconDefinition(name);
  function element(node: IconElement): string {
    const attrs = Object.entries(iconElementAttributes(node, strokeWidth)).map(([key, value]) => ` ${key}="${escape(value)}"`).join('');
    return `<${node.tag}${attrs}>${node.children.map(element).join('')}</${node.tag}>`;
  }
  const attrs = Object.entries(definition.attrs).map(([key, value]) => ` ${key}="${escape(value)}"`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="${strokeWidth}"${attrs}>${definition.children.map(element).join('')}</svg>`;
}
