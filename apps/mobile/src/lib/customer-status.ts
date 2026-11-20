export const statusColours = {
  info: { ink: '#24558A', background: '#EAF2FE', border: '#BCD3F3' },
  success: { ink: '#246342', background: '#E9F6ED', border: '#B9DEC6' },
  warning: { ink: '#80591C', background: '#FFF4D6', border: '#ECD598' },
  progress: { ink: '#664399', background: '#F1EBFA', border: '#D7C6EF' },
  danger: { ink: '#A33735', background: '#FFF0EE', border: '#EEBCB7' },
  neutral: { ink: '#63716E', background: '#EEEFEA', border: '#D7DBD4' },
} as const;
export type StatusTone = keyof typeof statusColours;

export function customerStatusTone(status: string): StatusTone {
  const value = status.toLowerCase().replace(/[_-]/g, ' ');
  if (/cancel|draft|not recorded|to be agreed/.test(value)) return 'neutral';
  if (/fail|overdue|action needed/.test(value)) return 'danger';
  if (/awaiting confirmation/.test(value)) return 'info';
  if (/awaiting customer|new times|needs alternatives|\bwaiting\b|pending|on hold|awaiting payment|courier arranged/.test(value)) return 'warning';
  if (/confirmed|complete|collected|delivered|paid|ready|packaged/.test(value)) return 'success';
  if (/progress|prepar|picking|assessment|cutting|sewing|construction|fitting|finishing|quality|being made|production|out for delivery|courier on/.test(value)) return 'progress';
  if (/awaiting confirmation|received|approved|scheduled|update/.test(value)) return 'info';
  return 'neutral';
}
