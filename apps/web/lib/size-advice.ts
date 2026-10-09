export type SizeRow = { size: string; heightMin: number; heightMax: number; weightMin: number; weightMax: number };
export function readSizeChart(value: unknown): SizeRow[] {
 if (!Array.isArray(value)) return [];
 return value.filter((row): row is SizeRow => Boolean(row && typeof row.size === 'string' && row.size.trim() &&
  [row.heightMin,row.heightMax,row.weightMin,row.weightMax].every(n => typeof n === 'number' && Number.isFinite(n)) &&
  row.heightMin > 0 && row.weightMin > 0 && row.heightMax >= row.heightMin && row.weightMax >= row.weightMin)).slice(0,30);
}
export function suggestSize(chart: SizeRow[], height: number, weight: number, loose: boolean, availableSizes: string[]) {
 if (!Number.isFinite(height) || !Number.isFinite(weight) || height < 100 || height > 230 || weight < 20 || weight > 250) return null;
 const matches=chart.filter(r => height >= r.heightMin && height <= r.heightMax && weight >= r.weightMin && weight <= r.weightMax);
 const row=matches[loose ? matches.length-1 : 0];
 if (!row) return null;
 return { size:row.size, available:availableSizes.includes(row.size) };
}
