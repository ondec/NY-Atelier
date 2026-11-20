import { createElement, type ComponentType, type SVGProps } from "react";
import { ICON_STROKE_WIDTH, getIconDefinition, iconElementAttributes, type IconElement, type IconName } from "../../../mobile/src/data/ny-icons";

export type NyIconProps = Omit<SVGProps<SVGSVGElement>, "ref" | "name"> & { size?: number | string };
export type NyIconComponent = ComponentType<NyIconProps>;
const attributeName = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
function part(node: IconElement, key: number, strokeWidth: number | string): React.ReactNode {
  return createElement(node.tag, { key, ...Object.fromEntries(Object.entries(iconElementAttributes(node, strokeWidth)).map(([name, value]) => [attributeName(name), value])) }, ...node.children.map((child, index) => part(child, index, strokeWidth)));
}
export function NyIcon({ name, size = 24, color = "currentColor", strokeWidth = ICON_STROKE_WIDTH, className, style, ...props }: NyIconProps & { name: IconName }) {
  const definition = getIconDefinition(name);
  const attrs = Object.fromEntries(Object.entries(definition.attrs).map(([name, value]) => [attributeName(name), value]));
  return <svg {...attrs} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" color={color} strokeWidth={strokeWidth} focusable="false" aria-hidden={props["aria-label"] ? undefined : true} role={props["aria-label"] ? "img" : undefined} className={`ny-icon ny-icon-${name}${className ? ` ${className}` : ""}`} style={{ flexShrink: 0, verticalAlign: "middle", ...style }} {...props}>{definition.children.map((child, index) => part(child, index, strokeWidth))}</svg>;
}
function createIcon(name: IconName): NyIconComponent {
  const Icon = (props: NyIconProps) => <NyIcon name={name} {...props} />;
  Icon.displayName = `NyIcon(${name})`;
  return Icon;
}
export const ArrowDownLeft = createIcon("arrow-down-left");
export const ArrowLeft = createIcon("arrow-left");
export const ArrowRight = createIcon("arrow-right");
export const ArrowUpRight = createIcon("arrow-up-right");
export const Ban = createIcon("ban");
export const Bell = createIcon("bell");
export const CalendarDays = createIcon("calendar-days");
export const Camera = createIcon("camera");
export const ChartGantt = createIcon("gantt");
export const Check = createIcon("check");
export const ChevronDown = createIcon("chevron-down");
export const ChevronLeft = createIcon("chevron-left");
export const ChevronRight = createIcon("chevron-right");
export const Circle = createIcon("dot");
export const ClipboardCheck = createIcon("clipboard-check");
export const ClipboardList = createIcon("order");
export const Clock3 = createIcon("clock");
export const Columns3 = createIcon("kanban");
export const Download = createIcon("download");
export const Expand = createIcon("expand");
export const Grid2X2 = createIcon("grid");
export const History = createIcon("history");
export const LayoutDashboard = createIcon("grid");
export const List = createIcon("list");
export const LoaderCircle = createIcon("progress");
export const LockKeyhole = createIcon("lock");
export const LogOut = createIcon("logout");
export const Minus = createIcon("minus");
export const Package = createIcon("package");
export const PackageCheck = createIcon("package-check");
export const PackagePlus = createIcon("package-plus");
export const Plus = createIcon("plus");
export const RefreshCw = createIcon("refresh");
export const Ruler = createIcon("ruler");
export const ScanLine = createIcon("scan");
export const Scissors = createIcon("scissors");
export const Search = createIcon("search");
export const Send = createIcon("send");
export const Shirt = createIcon("shirt");
export const ShoppingBag = createIcon("bag");
export const Sparkles = createIcon("sparkles");
export const Tablet = createIcon("tablet");
export const Trash2 = createIcon("trash");
export const TriangleAlert = createIcon("warning");
export const Upload = createIcon("upload");
export const UserRound = createIcon("user");
export const UserRoundCog = createIcon("user-settings");
export const Users = createIcon("users");
export const Wallet = createIcon("wallet");
export const WifiOff = createIcon("wifi-off");
export const X = createIcon("close");
