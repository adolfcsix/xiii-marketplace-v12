'use client';
import { useEffect, useRef, useState } from 'react';
import { sellerApi, SellerApiError } from '../lib/client-api';
import { OutfitAvatar } from '../../web/components/outfit-avatar';
import { DEFAULT_AVATAR, type Avatar } from '../../web/lib/outfit-appearance';
import type { OutfitSelection } from '../../web/lib/product-preview';
type Job = { id: string; variantId: string; form: string; status: string; sourceUrl: string; outputUrl: string; error: string };
type Availability = { enabled: boolean; supported: boolean; reason: string; dailyLimit: number };

export function SellerAiArtwork({productId,variantId,form,name,disabled,onApply,onBusyChange}:{productId:string;variantId:string;form:Avatar['form'];name:string;disabled:boolean;onApply:(url:string)=>void;onBusyChange:(busy:boolean)=>void}) {
 const [availability,setAvailability]=useState<Availability|null>(null),[job,setJob]=useState<Job|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[checked,setChecked]=useState(false),[applied,setApplied]=useState(false),[pollVersion,setPollVersion]=useState(0),[previewLoaded,setPreviewLoaded]=useState(false),[sourceLoaded,setSourceLoaded]=useState(false);
 const controller=useRef<AbortController|null>(null);
 function requestSignal(){return controller.current?AbortSignal.any([controller.current.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000);}const callbacks=useRef({onApply,onBusyChange});callbacks.current={onApply,onBusyChange};
 const path=`/seller/products/${productId}/ai-artwork`;const storageKey=`xiii-ai-artwork:${productId}:${variantId}:${form}`;
 function assertTarget(next:Job){if(next.variantId!==variantId||next.form!==form)throw new Error('Kết quả AI không đúng SKU hoặc dáng đang chọn.');}
 function track(next:Job){assertTarget(next);setJob(next);try{localStorage.setItem(storageKey,next.id);}catch{}setChecked(false);setApplied(false);}
 function setWorking(value:boolean){setBusy(value);callbacks.current.onBusyChange(value);}
 useEffect(()=>{
  setPreviewLoaded(false);setSourceLoaded(false);setChecked(false);
  if(!job?.outputUrl||job.status!=='READY')return;
  let active=true;const image=new Image(),source=new Image();image.onload=()=>{if(active)setPreviewLoaded(true);};image.onerror=()=>{if(active)setError('Không tải được ảnh AI. Hãy kiểm tra lại trước khi dùng.');};image.src=job.outputUrl;
  source.onload=()=>{if(active)setSourceLoaded(true);};source.onerror=()=>{if(active)setError('Không tải được ảnh gốc SKU để đối chiếu.');};source.src=job.sourceUrl;
  return()=>{active=false;image.onload=null;image.onerror=null;source.onload=null;source.onerror=null;};
 },[job?.outputUrl,job?.sourceUrl,job?.status]);
 useEffect(()=>{
  const abort=new AbortController();controller.current=abort;
  void sellerApi<Availability>(path+'/availability',{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])}).then(setAvailability).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Không kiểm tra được kết nối AI.');});
  let saved='';try{saved=localStorage.getItem(storageKey)||'';}catch{}
  if(saved){
   setJob({id:saved,variantId,form,status:'UNKNOWN',sourceUrl:'',outputUrl:'',error:''});
   void sellerApi<Job>(path+'/'+encodeURIComponent(saved),{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20000)])}).then(next=>{if(abort.signal.aborted)return;track(next);if(['QUEUED','RUNNING'].includes(next.status))setWorking(true);}).catch(e=>{if(abort.signal.aborted)return;if(e instanceof SellerApiError&&e.status===404||e instanceof Error&&e.message.includes('không đúng SKU')){setJob(null);try{localStorage.removeItem(storageKey);}catch{}}else setError('Chưa tải được yêu cầu đã lưu. Bấm kiểm tra yêu cầu AI trước khi tạo lượt mới.');});
  }
  return()=>{abort.abort();callbacks.current.onBusyChange(false);};
 },[path,storageKey]);
 useEffect(()=>{
  if(!job||!['QUEUED','RUNNING'].includes(job.status))return;
  let stopped=false;let timer:ReturnType<typeof setTimeout>;
  async function poll(){try{const next=await sellerApi<Job>(path+'/'+job!.id,{signal:requestSignal()});if(stopped)return;assertTarget(next);setJob(next);if(['QUEUED','RUNNING'].includes(next.status))timer=setTimeout(poll,2500);else setWorking(false);}catch(e){if(stopped)return;setWorking(false);setError((e instanceof Error?e.message:'Mất kết nối')+' · Yêu cầu vẫn được lưu. Bấm kiểm tra lại; hệ thống không tự tạo lượt mới.');}}
  timer=setTimeout(poll,1500);return()=>{stopped=true;clearTimeout(timer);};
 },[job?.id,job?.status,path,pollVersion]);
 async function generate(){setWorking(true);setError('');setChecked(false);setApplied(false);try{const next=await sellerApi<Job>(path,{method:'POST',body:JSON.stringify({variantId,form,requestId:crypto.randomUUID()}),signal:requestSignal()});if(controller.current?.signal.aborted)return;track(next);if(!['QUEUED','RUNNING'].includes(next.status))setWorking(false);}catch(e){if(controller.current?.signal.aborted)return;setError(e instanceof Error?e.message:'Không gửi được yêu cầu AI.');setWorking(false);}}
 async function refresh(){if(!job)return;setError('');try{const next=await sellerApi<Job>(path+'/'+job.id,{signal:requestSignal()});if(controller.current?.signal.aborted)return;assertTarget(next);setJob(next);setWorking(['QUEUED','RUNNING'].includes(next.status));setPollVersion(v=>v+1);}catch(e){if(!controller.current?.signal.aborted)setError(e instanceof Error?e.message:'Không kiểm tra được yêu cầu.');}}
 async function review(decision:'ACCEPT'|'REJECT'){if(!job||decision==='ACCEPT'&&(!previewLoaded||!sourceLoaded||!checked))return;setWorking(true);setError('');try{const next=await sellerApi<Job>(path+'/'+job.id+'/review',{method:'POST',body:JSON.stringify({decision}),signal:requestSignal()});if(controller.current?.signal.aborted)return;if(next.variantId!==variantId||next.form!==form)throw new Error('Kết quả AI không đúng SKU hoặc dáng đang chọn.');setJob(next);if(decision==='ACCEPT'){callbacks.current.onApply(next.outputUrl);setApplied(true);}else setChecked(false);}catch(e){if(!controller.current?.signal.aborted)setError(e instanceof Error?e.message:'Không duyệt được ảnh.');}finally{if(!controller.current?.signal.aborted)setWorking(false);}}
 const chosen:Array<OutfitSelection|null>=Array(5).fill(null);if(job?.outputUrl)chosen[0]={product:{_id:productId,slug:'ai-preview',name,attributes:{outfitPreview:{variantOverlays:{[variantId]:{[form]:job.outputUrl}}}}},variant:{_id:variantId,sku:variantId,price:0,attributes:{}}};
 const waiting=Boolean(job&&['QUEUED','RUNNING'].includes(job.status));
 return <div className="seller-ai-artwork" aria-label="AI tạo áo mặc thử"><span className="eyebrow">AI / THỬ NGHIỆM CHO ÁO</span><h3>Tạo từ ảnh SKU</h3><p>AI tách và đặt áo vào khung mẫu. Upload ảnh rõ, đúng màu vào SKU rồi lưu SKU trước. Kết quả cần shop kiểm tra trước khi dùng.</p>
 {!availability?<p role="status">{error?'Chưa kết nối được AI.':'Đang kiểm tra kết nối AI…'}</p>:!availability.supported?<p>Thử nghiệm hiện hỗ trợ áo, hoodie và sweater.</p>:!availability.enabled?<p role="status">{availability.reason}</p>:<><p className="seller-form-note">Tối đa {availability.dailyLimit} lượt/shop/ngày (UTC). Ảnh SKU sẽ được gửi tới OpenAI để xử lý; mỗi lượt mới có thể phát sinh phí trên tài khoản API.</p><button type="button" className="seller-primary" disabled={disabled||busy||waiting||job?.status==='READY'||job?.status==='UNKNOWN'} onClick={()=>void generate()}>{waiting?'Đang tạo ảnh…':job?.status==='FAILED'||job?.status==='REJECTED'?'Tạo lượt AI mới':'Tạo áo bằng AI'}</button></>}
 {error&&<p role="alert" className="seller-alert">{error}</p>}
 {waiting&&<p role="status">{job?.status==='QUEUED'?'Đang xếp hàng…':'AI đang xử lý ảnh…'} Bạn có thể đóng trang và quay lại kiểm tra.</p>}
 {job&&<button type="button" className="seller-secondary" disabled={busy&&!waiting} onClick={()=>void refresh()}>Kiểm tra yêu cầu AI</button>}
 {job?.status==='FAILED'&&<p role="alert">{job.error}</p>}{job?.status==='REJECTED'&&<p role="status">Đã bỏ ảnh AI. Artwork đang dùng được giữ nguyên.</p>}
 {job?.status==='READY'&&<><div className="seller-ai-compare"><figure><img src={job.sourceUrl} alt="Ảnh gốc SKU gửi AI" onLoad={()=>setSourceLoaded(true)} onError={()=>{setSourceLoaded(false);setError('Không tải được ảnh gốc SKU để đối chiếu.');}}/><figcaption>Ảnh gốc của SKU</figcaption></figure><figure><OutfitAvatar avatar={{...DEFAULT_AVATAR,form}} chosen={chosen} focus={null}/><figcaption>Ảnh AI trên mẫu · chưa lưu</figcaption></figure></div><label className="seller-ai-check"><input type="checkbox" checked={checked} disabled={disabled||busy||applied||!previewLoaded||!sourceLoaded} onChange={e=>setChecked(e.target.checked)}/>Tôi đã kiểm tra màu, logo, hoạ tiết, dáng áo và vị trí trên mẫu khớp hàng bán.</label><div className="seller-ai-actions"><button type="button" className="seller-primary" disabled={disabled||busy||!checked||applied||!previewLoaded||!sourceLoaded} onClick={()=>void review('ACCEPT')}>Dùng ảnh AI cho SKU này</button><button type="button" className="seller-secondary" disabled={disabled||busy||applied} onClick={()=>void review('REJECT')}>Bỏ ảnh AI</button></div>{applied&&<p role="status">Đã đưa ảnh vào bản chỉnh sửa. Bấm “Lưu thông tin” để lưu và gửi duyệt theo quy trình sản phẩm.</p>}</>}
 <p className="seller-form-note">AI có thể sai logo, chất liệu hoặc vị trí. Đây là hình minh hoạ 2D, không xác nhận size vừa người và không tạo trang phục 3D.</p></div>;
}
