import type { ControlTileState, MetricTileState, SimSpeed } from './operations-cockpit-state-types';

export function formatInspectorValue(tuning?: ControlTileState['primaryTuning']): string {
  if (!tuning) return 'Nominal';
  return formatValue(tuning.value, tuning.unit);
}

export function formatSpeed(speed: SimSpeed): string {
  return `${speed}x`;
}

export function formatValue(value: string | number, unit?: string): string {
  if (!unit) return String(value);
  if (unit === '$') return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (unit.startsWith('/')) return `${value}${unit}`;
  return `${value} ${unit}`;
}

export function metricPercent(item: MetricTileState): string {
  if (typeof item.value !== 'number') return '65%';
  if (item.unit === 'Â°C') return `${clamp((item.value / 35) * 100, 0, 100)}%`;
  if (item.unit === 'ppm') return `${clamp((item.value / 1600) * 100, 0, 100)}%`;
  return `${clamp(item.value, 0, 100)}%`;
}

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
