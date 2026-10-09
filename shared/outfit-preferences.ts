export type MannequinView = '2d' | '3d';

/** Accept both the old raw value and JSON written by current versions. */
export function readMannequinView(value: string | null): MannequinView {
  if (value === '2d' || value === '3d') return value;
  try { return JSON.parse(value || 'null') === '2d' ? '2d' : '3d'; }
  catch { return '3d'; }
}
