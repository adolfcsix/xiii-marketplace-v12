'use client';
import type {SellerSizeRow} from '../../../shared/size-chart';
export {validSellerSizeRows,type SellerSizeRow} from '../../../shared/size-chart';
export function SellerSizeChart({rows,onChange,disabled}:{rows:SellerSizeRow[];onChange:(rows:SellerSizeRow[])=>void;disabled:boolean}){
 const columns=[['heightMin','Cao từ (cm)'],['heightMax','Cao đến (cm)'],['weightMin','Nặng từ (kg)'],['weightMax','Nặng đến (kg)']] as const;
 return <section className="seller-panel seller-form-card"><span className="eyebrow">SIZE ADVICE</span><h2>Bảng gợi ý kích cỡ</h2><p>Nhập khoảng chiều cao và cân nặng phù hợp theo sản phẩm của shop. Để trống nếu chưa có dữ liệu; Buyer sẽ được hướng dẫn hỏi shop.</p>
  {rows.map((row,i)=><fieldset key={i} disabled={disabled} style={{border:'1px solid #ddd',padding:12,marginBottom:12}}><legend>Dòng {i+1}</legend><div className="seller-form-grid"><label>Size<input value={row.size} onChange={e=>onChange(rows.map((r,n)=>n===i?{...r,size:e.target.value}:r))} maxLength={20}/></label>{columns.map(([field,label])=><label key={field}>{label}<input type="number" min="1" step="0.1" value={row[field]||''} onChange={e=>onChange(rows.map((r,n)=>n===i?{...r,[field]:Number(e.target.value)}:r))}/></label>)}</div><button type="button" onClick={()=>onChange(rows.filter((_,n)=>n!==i))}>Xóa dòng {i+1}</button></fieldset>)}
  <button type="button" disabled={disabled||rows.length>=30} onClick={()=>onChange([...rows,{size:'',heightMin:0,heightMax:0,weightMin:0,weightMax:0}])}>+ Thêm dòng size</button>
 </section>;
}
