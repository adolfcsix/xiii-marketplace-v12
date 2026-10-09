export type SellerSizeRow={size:string;heightMin:number;heightMax:number;weightMin:number;weightMax:number};
export function validSellerSizeRows(value:unknown):value is SellerSizeRow[]{
 return Array.isArray(value)&&value.length<=30&&value.every(r=>r&&typeof r.size==='string'&&r.size.trim()&&
  [r.heightMin,r.heightMax,r.weightMin,r.weightMax].every(v=>typeof v==='number'&&Number.isFinite(v))&&r.heightMin>0&&r.weightMin>0&&r.heightMax>=r.heightMin&&r.weightMax>=r.weightMin);
}
