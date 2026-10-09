'use client';
import { useId, useState } from 'react';
import { readSizeChart, suggestSize } from '../lib/size-advice';
export function SizeAdvisor({ chart, sizes, onSelect, disabled=false }: { chart:unknown; disabled?:boolean; sizes:string[]; onSelect:(size:string)=>void }) {
 const id=useId(); const rows=readSizeChart(chart);
 const [height,setHeight]=useState(''); const [weight,setWeight]=useState(''); const [loose,setLoose]=useState(false); const [submitted,setSubmitted]=useState(false);
 const advice=submitted?suggestSize(rows,Number(height),Number(weight),loose,sizes):null;
 return <details className="size-advisor"><summary>↗ Gợi ý kích cỡ cho bạn</summary>
  {!rows.length?<p>Shop chưa cung cấp bảng chiều cao / cân nặng cho sản phẩm này. Đo món đồ bạn đang mặc vừa và hỏi shop để chọn đúng size.</p>:<fieldset disabled={disabled} style={{border:0,padding:0,margin:0,minWidth:0}}>
   <p>Đối chiếu với bảng kích cỡ của shop. Kết quả mang tính tham khảo; form và số đo thực tế vẫn cần kiểm tra.</p>
   <div className="size-advisor-fields"><label htmlFor={id+'-height'}>Chiều cao (cm)<input id={id+'-height'} type="number" min="100" max="230" value={height} onChange={e=>{setHeight(e.target.value);setSubmitted(false);}}/></label>
    <label htmlFor={id+'-weight'}>Cân nặng (kg)<input id={id+'-weight'} type="number" min="20" max="250" step="0.1" value={weight} onChange={e=>{setWeight(e.target.value);setSubmitted(false);}}/></label></div>
   <label className="size-loose"><input type="checkbox" checked={loose} onChange={e=>{setLoose(e.target.checked);setSubmitted(false);}}/>Ưu tiên rộng khi nhiều size cùng phù hợp</label>
   <button type="button" onClick={()=>setSubmitted(true)}>Tìm size phù hợp</button>
   {submitted&&<div role="status">{advice?<><strong>Size tham khảo: {advice.size}</strong>{advice.available?<button type="button" onClick={()=>onSelect(advice.size)}>Chọn size {advice.size}</button>:<p>Size này đang hết hàng cho màu đã chọn.</p>}</>:<p>Chưa tìm được size phù hợp trong bảng của shop. Kiểm tra chiều cao / cân nặng hoặc hỏi shop.</p>}</div>}
   <div className="size-chart-scroll"><table><caption>Bảng tham khảo của shop</caption><thead><tr><th>Size</th><th>Chiều cao (cm)</th><th>Cân nặng (kg)</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.size+i}><td>{r.size}</td><td>{r.heightMin}–{r.heightMax}</td><td>{r.weightMin}–{r.weightMax}</td></tr>)}</tbody></table></div>
  </fieldset>}
 </details>;
}
