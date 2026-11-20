import { Ban, Check, Circle, Clock3, LoaderCircle, Minus, PackageCheck, TriangleAlert } from "@/components/icons";
import { statusTone, type StatusTone } from "@/lib/status";

const icons = { neutral: Minus, info: Circle, progress: LoaderCircle, ready: PackageCheck, success: Check, warning: Clock3, danger: TriangleAlert };

export default function StatusBadge({ status, tone, className = "" }: { status: string; tone?: StatusTone; className?: string }) {
  const resolved = tone ?? statusTone(status);
  const Icon = /^(cancelled|canceled)$/i.test(status) ? Ban : icons[resolved];
  return <span className={`status-badge ${className}`} data-tone={resolved}><Icon size={13} aria-hidden="true" />{status}</span>;
}
