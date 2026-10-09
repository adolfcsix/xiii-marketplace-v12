'use client';
import Link from 'next/link';
import {celebrateCart} from '../lib/cart-motion';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { apiPage } from '../lib/api';
import { toHomeCard, type CatalogProduct } from '../lib/home-data';
import { loadPreview, type OutfitSelection } from '../lib/product-preview';
import { OutfitMannequin3D } from './outfit-mannequin-3d';
import { OutfitAvatar } from './outfit-avatar';
import {readMannequinView,type MannequinView} from '../../../shared/outfit-preferences';
import {DEFAULT_AVATAR,SKIN_TONES,readAvatar,outfitSlot,outfitOwnerKey,itemPreview,type Avatar} from '../lib/outfit-appearance';
import { clientApi, emitCartUpdated, hasSession } from '../lib/client-api';
import type { ProductCardData } from './product-card';
const Preview=dynamic(()=>import('./product-preview').then(m=>m.ProductPreview),{ssr:false});
const slots=['Áo','Quần','Giày','Phụ kiện','Áo khoác'];
const emptySlots=()=>slots.map(()=>null);
const money=(value:number)=>new Intl.NumberFormat('vi-VN').format(value)+'₫';
type BuilderProps={initialProducts:ProductCardData[];initialError:boolean;seed:string;initialPages?:number};
type SavedLook={id:string;name:string;items:DraftItem[];avatar:Avatar};
export function OutfitBuilder(props:BuilderProps){
 const [owner,setOwner]=useState<string|null>(null);
 useEffect(()=>{const sync=()=>setOwner(outfitOwnerKey());sync();window.addEventListener('xiii-buyer-session-cleared',sync);window.addEventListener('xiii-buyer-token-refreshed',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('xiii-buyer-session-cleared',sync);window.removeEventListener('xiii-buyer-token-refreshed',sync);window.removeEventListener('storage',sync)}},[]);
 return owner?<OutfitBuilderSession key={owner} {...props} storageKey={owner}/>:<p role="status">Đang mở phòng phối đồ…</p>;
}
type DraftItem={slug:string;variantId:string}|null;
function OutfitBuilderSession({initialProducts,initialError,seed,storageKey,initialPages=1}:{storageKey:string}&BuilderProps) {
 const board=useRef<HTMLDivElement>(null);const [stage,setStage]=useState(true);const [mannequinView,setMannequinView]=useState<MannequinView>('3d');const [focus,setFocus]=useState<number|null>(null);
 const [chosen,setChosen]=useState<Array<OutfitSelection|null>>(emptySlots());const [slot,setSlot]=useState(0);
 const [products,setProducts]=useState(initialProducts);const [query,setQuery]=useState('');const [error,setError]=useState(initialError?'Chưa tải được sản phẩm.':'');const [loading,setLoading]=useState(false);
 const [page,setPage]=useState(1);const [pages,setPages]=useState(initialPages);const [catalogQuery,setCatalogQuery]=useState('');const [customizing,setCustomizing]=useState(false);
 const [preview,setPreview]=useState('');const [previewVariant,setPreviewVariant]=useState('');const [draft,setDraft]=useState<DraftItem[]>(emptySlots());const [ready,setReady]=useState(false);const [restoreNotice,setRestoreNotice]=useState('');
 const [busy,setBusy]=useState(false);const busyRef=useRef(false);const [notice,setNotice]=useState('');const [added,setAdded]=useState<string[]>([]);
 const [avatar,setAvatar]=useState<Avatar>(DEFAULT_AVATAR);const [looks,setLooks]=useState<SavedLook[]>([]);const [lookName,setLookName]=useState('');const [restoreVersion,setRestoreVersion]=useState(0);
 const key=storageKey;
 const cartRequest=useRef<AbortController|null>(null);
 useEffect(()=>()=>cartRequest.current?.abort(),[]);
 const searchRequest=useRef<AbortController|null>(null);const persistAllowed=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();persistAllowed.current=false;setReady(false);setChosen(emptySlots());setDraft(emptySlots());setPreview('');setPreviewVariant('');setRestoreNotice('');
  (async()=>{try{
   const readSaved=(suffix:string,fallback:unknown):unknown=>{try{const value=localStorage.getItem(key+suffix);return suffix===':mannequin-view'?readMannequinView(value):JSON.parse(value||JSON.stringify(fallback));}catch{if(!controller.signal.aborted)setRestoreNotice('Một phần dữ liệu đã lưu bị lỗi; các phần còn lại vẫn được khôi phục.');return fallback;}};
   const saved=readSaved('',[]);
   if(!controller.signal.aborted){setAvatar(readAvatar(readSaved(':avatar',null)));setMannequinView(readSaved(':mannequin-view','3d')==='2d'?'2d':'3d');const savedLooks:unknown=readSaved(':looks',[]);setLooks(Array.isArray(savedLooks)?savedLooks.filter((v):v is SavedLook=>v&&typeof v.id==='string'&&typeof v.name==='string'&&Array.isArray(v.items)).slice(0,12):[]);}
   if(Array.isArray(saved)){
    const seenDraft=new Set<string>();const refs=slots.map((_,i):DraftItem=>{const item=saved[i];if(!item||typeof item.slug!=='string'||!item.slug.trim()||typeof item.variantId!=='string'||!item.variantId.trim()||seenDraft.has(item.variantId))return null;seenDraft.add(item.variantId);return {slug:item.slug,variantId:item.variantId};});if(!controller.signal.aborted)setDraft(refs);
    const restored=await Promise.all(slots.map(async(_,i)=>{
     const item=refs[i];if(!item)return null;
     try{const result=await loadPreview(item.slug,controller.signal);const variant=result.variants.find(v=>v._id===item.variantId);const detected=outfitSlot(result.product.name,result.product.category?.name||'');if(detected!==null&&detected!==i&&!(i===0&&detected===4&&refs[4]===null)){if(!controller.signal.aborted)setRestoreNotice('Có món đã lưu sai danh mục. Hãy chọn lại để mặc đúng vị trí.');return null;}if(!variant){if(!controller.signal.aborted)setRestoreNotice('Một số lựa chọn đã lưu không còn bán. Hãy chọn lại món.');return null;}return {product:result.product,variant};}catch{if(!controller.signal.aborted)setRestoreNotice('Một số món đã lưu chưa tải lại được. Hãy chọn lại trước khi thêm vào giỏ.');return null;}
    }));if(!controller.signal.aborted){const seen=new Set<string>();const relocated=[...restored];if(relocated[0]&&outfitSlot(relocated[0].product.name,relocated[0].product.category?.name||'')===4&&!relocated[4]){relocated[4]=relocated[0];relocated[0]=null;setDraft(old=>old.map((v,i)=>i===0?null:i===4?refs[0]:v));}setChosen(relocated.map(item=>{if(!item||seen.has(item.variant._id))return null;seen.add(item.variant._id);return item;}));}
   }
  }catch{if(!controller.signal.aborted)setRestoreNotice('Không đọc được outfit đã lưu trên thiết bị này.');}
  finally{if(!controller.signal.aborted){setReady(true);if(restoreVersion)setNotice('Đã mở bộ phối đã lưu.');if(seed&&!restoreVersion)setPreview(seed);}}
  })();return()=>{controller.abort();searchRequest.current?.abort();};
 },[seed,key,restoreVersion]);
 useEffect(()=>{if(!ready||!persistAllowed.current)return;try{localStorage.setItem(key,JSON.stringify(draft));}catch{setRestoreNotice('Không lưu được outfit trên thiết bị này; bạn vẫn có thể phối và thêm vào giỏ.');}},[draft,ready]);
 function updateAvatar(next:Avatar){setAvatar(next);try{localStorage.setItem(key+':avatar',JSON.stringify(next));}catch{setRestoreNotice('Không lưu được tuỳ chỉnh nhân vật.')}}
 function updateMannequinView(next:MannequinView){setMannequinView(next);try{localStorage.setItem(key+':mannequin-view',JSON.stringify(next));}catch{setRestoreNotice('Không lưu được chế độ xem trên thiết bị này.')}}
 function saveLook(){if(!selected.length)return;if(looks.length>=12){setNotice('Đã lưu đủ 12 bộ. Hãy xoá một bộ trước khi lưu bộ mới.');return;}const next:SavedLook[]=[{id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),name:lookName.trim().slice(0,48)||'Bộ phối '+(looks.length+1),items:chosen.map(item=>item?{slug:item.product.slug,variantId:item.variant._id}:null),avatar},...looks].slice(0,12);try{localStorage.setItem(key+':looks',JSON.stringify(next));setLooks(next);setLookName('');setNotice('Đã lưu bộ phối trên thiết bị này.');}catch{setNotice('Thiết bị không cho phép lưu bộ phối.')}}
 function restoreLook(look:SavedLook){try{persistAllowed.current=false;localStorage.setItem(key,JSON.stringify(look.items));localStorage.setItem(key+':avatar',JSON.stringify(readAvatar(look.avatar)));setAdded([]);setFocus(null);setNotice('Đang mở '+look.name+'…');setRestoreVersion(v=>v+1);}catch{setNotice('Không mở được bộ phối đã lưu.')}}
 function deleteLook(id:string){const next=looks.filter(look=>look.id!==id);try{localStorage.setItem(key+':looks',JSON.stringify(next));setLooks(next);}catch{setNotice('Không xoá được bộ phối đã lưu.')}}
 const activeFocus=focus!==null&&chosen[focus]?focus:null;
 const visibleProducts=products.filter(product=>{const category=outfitSlot(product.name,product.category);return category===null||category===slot;});
 const selected=chosen.filter((v):v is OutfitSelection=>Boolean(v));const total=selected.reduce((n,item)=>n+item.variant.price,0);
 async function search(event:React.FormEvent){
  event.preventDefault();await fetchCatalog(1,query);
 }
 async function fetchCatalog(nextPage:number,term:string){searchRequest.current?.abort();const controller=new AbortController();searchRequest.current=controller;setLoading(true);setError('');
  try{const result=await apiPage<CatalogProduct[]>('/products?limit=24&page='+nextPage+'&q='+encodeURIComponent(term),{signal:controller.signal});if(!Array.isArray(result.data))throw new Error('Không tải được sản phẩm.');if(!controller.signal.aborted){const cards=result.data.map(toHomeCard);setProducts(old=>nextPage===1?cards:[...old,...cards.filter(card=>!old.some(v=>v._id===card._id))]);setPage(nextPage);setPages(Number(result.meta?.totalPages)||1);setCatalogQuery(term);}}
  catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Không tìm được sản phẩm.');}finally{if(!controller.signal.aborted)setLoading(false);}
 }
 async function addOutfit(){
  if(busyRef.current||!selected.length)return;
  if(!hasSession()){window.location.href='/login?next='+encodeURIComponent('/outfit');return;}
  busyRef.current=true;setBusy(true);setNotice('Đang kiểm tra giá và tồn kho…');
  const controller=new AbortController();cartRequest.current=controller;const timeout=setTimeout(()=>controller.abort(),20000);
  let done=[...added];
  try{
   const fresh=await Promise.all(selected.filter(item=>!done.includes(item.variant._id)).map(async item=>{const result=await loadPreview(item.product.slug,controller.signal);const variant=result.variants.find(v=>v._id===item.variant._id);if(!variant||(variant.available??0)<=0)throw new Error(item.product.name+' đã hết hàng hoặc không còn lựa chọn này.');if(variant.price!==item.variant.price)throw new Error(item.product.name+' đã đổi giá. Hãy mở lại và chọn món để cập nhật giá.');return variant;}));
   for(const variant of fresh){controller.signal.throwIfAborted();if(done.includes(variant._id))continue;await clientApi('/cart/items',{method:'POST',signal:controller.signal,body:JSON.stringify({variantId:variant._id,quantity:1})});done.push(variant._id);setAdded([...done]);emitCartUpdated();celebrateCart(board.current?.querySelector<HTMLImageElement>('.outfit-slot[data-variant="'+variant._id+'"] img')||null,board.current?.querySelector('.outfit-summary .street-button'));}
   setNotice('Đã thêm các món đã chọn vào giỏ.');
  }catch(e){setNotice((e instanceof Error?e.message:'Không thêm được outfit.')+(done.length?' Những món đã thêm vẫn nằm trong giỏ; thử lại sẽ bỏ qua chúng.':'')+' Nếu kết nối bị ngắt khi đang thêm, hãy kiểm tra giỏ trước khi thử lại.');}
  finally{clearTimeout(timeout);controller.abort();busyRef.current=false;setBusy(false);}
 }
 return <div className="outfit-builder fashion-game" ref={board}>
  <section className="outfit-board" aria-label="Outfit của bạn">
   <div className="outfit-stage-toolbar"><span>XIII DRESS UP / {selected.length} MÓN</span><div className="mannequin-view-toggle" role="group" aria-label="Chế độ xem ma-nơ-canh"><button type="button" aria-pressed={mannequinView==='2d'} onClick={()=>updateMannequinView('2d')}>2D</button><button type="button" aria-pressed={mannequinView==='3d'} onClick={()=>updateMannequinView('3d')}>3D</button></div><button type="button" aria-expanded={stage} aria-controls="outfit-stage" onClick={()=>{setStage(!stage);setFocus(null);}}>{stage?'Ẩn nhân vật':'Hiện nhân vật'}</button></div>
   {stage&&<div id="outfit-stage" className="dressing-room">
    <div className="avatar-scene" aria-label={'Bản xem bộ phối '+mannequinView.toUpperCase()}><span className="avatar-scene-label">XIII / FIT STUDIO · {mannequinView.toUpperCase()}</span>{mannequinView==='3d'?<OutfitMannequin3D avatar={avatar} chosen={chosen}/>:<OutfitAvatar avatar={avatar} chosen={chosen} focus={activeFocus}/>}<p>{selected.length?(mannequinView==='2d'?'Bản 2D dùng ảnh mặc thử của shop nếu có.':'Kéo hoặc vuốt nhân vật để xoay góc nhìn.'):'Chọn trang phục bên dưới để mặc lên ma-nơ-canh.'}</p></div>
    <div className="avatar-controls" data-customizing={customizing}><button className="avatar-customize" type="button" aria-expanded={customizing} onClick={()=>setCustomizing(!customizing)}>{customizing?'Thu gọn tuỳ chỉnh':'Tuỳ chỉnh nhân vật'} <span>↗</span></button><div className="avatar-customization"><span className="street-eyebrow">YOUR AVATAR</span><h2>Nhân vật của bạn.</h2><p>Chọn dáng bạn thích. Bạn có thể phối mọi phong cách trên bất kỳ nhân vật nào.</p>
     <fieldset disabled={busy||!ready}><legend>Dáng nhân vật</legend><div className="avatar-options">{([['masculine','Nam'],['feminine','Nữ'],['neutral','Trung tính']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={avatar.form===value} onClick={()=>updateAvatar({...avatar,form:value,hair:value==='feminine'?'long':'short'})}>{label}</button>)}</div></fieldset>
     <fieldset disabled={busy||!ready}><legend>Form cơ thể</legend><div className="avatar-options">{([['slim','Gọn'],['regular','Vừa'],['relaxed','Rộng']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={avatar.build===value} onClick={()=>updateAvatar({...avatar,build:value})}>{label}</button>)}</div></fieldset>
     <fieldset disabled={busy||!ready}><legend>Màu da</legend><div className="avatar-options">{SKIN_TONES.map((skin,i)=><button type="button" key={skin} aria-label={'Màu da '+(i+1)} aria-pressed={avatar.skin===skin} onClick={()=>updateAvatar({...avatar,skin})}><span className="skin-swatch" style={{background:skin}}/></button>)}</div></fieldset>
     <fieldset disabled={busy||!ready}><legend>Tóc</legend><div className="avatar-options">{(['short','long','bob','tied'] as const).map(hair=><button type="button" key={hair} aria-pressed={avatar.hair===hair} onClick={()=>updateAvatar({...avatar,hair})}>{{short:'Tóc ngắn',long:'Tóc dài',bob:'Tóc bob',tied:'Tóc buộc'}[hair]}</button>)}</div></fieldset>
     <fieldset disabled={busy||!ready}><legend>Khuôn mặt</legend><div className="avatar-options">{([['soft','Mềm mại'],['defined','Góc cạnh']] as const).map(([face,label])=><button type="button" key={face} aria-pressed={avatar.face===face} onClick={()=>updateAvatar({...avatar,face})}>{label}</button>)}</div></fieldset></div>
     <div className="equipped-chips" role="group" aria-label="Trang phục đang mặc">{chosen.map((item,i)=>item&&<button type="button" key={i} aria-pressed={activeFocus===i} onClick={()=>setFocus(activeFocus===i?null:i)}><span>✓ {slots[i]}</span><small>{item.product.name}</small></button>)}</div>
     <small className="avatar-disclaimer">Bản 2D dùng ảnh mặc thử của shop nếu có. Bản 3D minh hoạ màu và phom; chi tiết trang phục và mặt khuất có thể khác ảnh thật. Cả hai chế độ chưa mô phỏng độ vừa theo số đo. Hãy đối chiếu ảnh sản phẩm và thông tin size.</small>
    </div>
   </div>}
   <div className="outfit-slots">{slots.map((name,i)=>{const item=chosen[i];return <div key={name} className="outfit-slot" data-selected={Boolean(item)} data-variant={item?.variant._id} data-depth="product"><h2>{name}</h2>{item?<><div className="product-visual" key={item.variant._id}><img src={item.variant.image||item.product.images?.[0]||'/products/fallback.svg'} alt={item.product.name}/></div><strong>{item.product.name}</strong><small className="outfit-artwork-badge">{mannequinView==='2d'&&itemPreview(item,i,avatar.form).overlay?'Ảnh mặc thử 2D của shop':'Minh hoạ kiểu dáng'}</small><span>{Object.values(item.variant.attributes||{}).join(' / ')}</span><b>{money(item.variant.price)}</b><button type="button" disabled={busy||!ready} onClick={()=>{setSlot(i);setPreviewVariant(item.variant._id);setPreview(item.product.slug);}}>Đổi lựa chọn {name.toLowerCase()}</button><button type="button" disabled={busy||!ready} onClick={()=>{persistAllowed.current=true;setDraft(items=>items.map((v,index)=>index===i?null:v));setChosen(items=>items.map((v,index)=>index===i?null:v));setNotice('');}} aria-label={'Gỡ '+name.toLowerCase()}>Gỡ món ×</button></>:draft[i]?<><button type="button" className="outfit-empty" disabled={busy||!ready} onClick={()=>{setSlot(i);setPreviewVariant(draft[i]!.variantId);setPreview(draft[i]!.slug);}}>Thử tải lại {name.toLowerCase()}</button><button type="button" disabled={busy||!ready} onClick={()=>{persistAllowed.current=true;setDraft(items=>items.map((v,index)=>index===i?null:v));}} aria-label={'Gỡ món đã lưu '+name.toLowerCase()}>Gỡ món đã lưu ×</button></>:<button type="button" className="outfit-empty" disabled={busy||!ready} onClick={()=>setSlot(i)} aria-pressed={slot===i}>+ Chọn {name.toLowerCase()}</button>}</div>})}</div>
   <div className="outfit-summary"><div><span>{selected.length} món đã chọn</span><strong>Tạm tính: {money(total)}</strong><small>Chưa gồm vận chuyển và ưu đãi tại checkout.</small></div><button type="button" className="street-button" disabled={busy||!ready||!selected.length||selected.every(item=>added.includes(item.variant._id))} onClick={addOutfit}>{busy?'Đang thêm…':selected.length&&selected.every(item=>added.includes(item.variant._id))?'Đã thêm vào giỏ':'Thêm các món vào giỏ'}</button><Link href="/cart">Xem giỏ hàng ↗</Link></div>
   <section className="outfit-save" aria-label="Lưu bộ phối"><label htmlFor="outfit-name">Đặt tên bộ phối</label><div><input id="outfit-name" maxLength={48} placeholder="Ví dụ: Đi chơi cuối tuần" value={lookName} onChange={e=>setLookName(e.target.value)}/><button className="street-button" type="button" disabled={!ready||busy||!selected.length||looks.length>=12} onClick={saveLook}>Lưu bộ phối</button></div><small>Tối đa 12 bộ, lưu riêng cho tài khoản trên trình duyệt này; khách có bộ lưu riêng.</small>{looks.length>0&&<ul>{looks.map(look=><li key={look.id}><button type="button" disabled={busy||!ready} onClick={()=>restoreLook(look)}>{look.name} ↗</button><button type="button" disabled={busy||!ready} aria-label={'Xoá bộ phối '+look.name} onClick={()=>deleteLook(look.id)}>×</button></li>)}</ul>}</section>
   {notice&&<p className="outfit-notice" role="status">{notice}</p>}{restoreNotice&&<p role="status">{restoreNotice}</p>}{!ready&&<p role="status">Đang khôi phục outfit…</p>}
  </section>
  <section className="outfit-catalog"><div className="street-section-heading"><div><span className="street-eyebrow">BUILD YOUR OWN LOOK</span><h2>Tủ đồ của bạn.</h2><p>Chọn {slots[slot].toLowerCase()}, màu và size đang bán để mặc lên mẫu.</p></div></div>
   <div className="outfit-tabs" role="group" aria-label="Vị trí trong outfit">{slots.map((s,i)=><button type="button" key={s} disabled={busy} aria-pressed={slot===i} onClick={()=>setSlot(i)}>{s}</button>)}</div>
   <form onSubmit={search} className="outfit-search"><label htmlFor="outfit-query" className="sr-only">Tìm món để phối</label><input id="outfit-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm áo, quần, giày hoặc thương hiệu…"/><button type="submit">{loading?'Đang tìm…':'Tìm sản phẩm'}</button></form>
   {error?<p role="alert">{error} Hãy tìm lại sản phẩm.</p>:loading?<p role="status">Đang tìm sản phẩm…</p>:!visibleProducts.length?<p>Chưa có {slots[slot].toLowerCase()} phù hợp. Thử từ khoá khác hoặc đổi danh mục.</p>:<div className="outfit-product-grid">{visibleProducts.map(product=><button type="button" key={product._id} disabled={busy||!ready} onClick={()=>{setPreviewVariant('');setPreview(product.slug);}}><img src={product.image||'/products/fallback.svg'} alt="" loading="lazy"/><strong>{product.name}</strong><span>{product.price===undefined?'Xem lựa chọn':money(product.price)}</span><small>Chọn màu / size ↗</small></button>)}</div>}
   {page<pages&&<button type="button" className="street-button wardrobe-more" disabled={loading} onClick={()=>fetchCatalog(page+1,catalogQuery)}>Xem thêm sản phẩm</button>}
  </section>
  {preview&&<Preview key={preview} slug={preview} initialVariantId={previewVariant} onClose={()=>setPreview('')} onChoose={item=>{const detected=outfitSlot(item.product.name,item.product.category?.name||'');const targetSlot=detected??slot;setSlot(targetSlot);if(chosen.some((v,i)=>i!==targetSlot&&v?.variant._id===item.variant._id)){setPreview('');setNotice('Món và lựa chọn này đã có trong outfit. Hãy chọn món khác.');return;}persistAllowed.current=true;setDraft(items=>items.map((v,i)=>i===targetSlot?{slug:item.product.slug,variantId:item.variant._id}:v));setChosen(items=>items.map((v,i)=>i===targetSlot?item:v));setStage(true);setPreview('');setNotice('Đã mặc '+item.product.name+' lên nhân vật.');}}/>}
 </div>;
}
