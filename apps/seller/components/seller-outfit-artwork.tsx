'use client';
import {useState} from 'react';
import {ImageUploader} from '../../../shared/image-uploader';
import {uploadSellerImage} from '../lib/upload';
import {OutfitAvatar} from '../../web/components/outfit-avatar';
import {DEFAULT_AVATAR,outfitSlot,type Avatar} from '../../web/lib/outfit-appearance';
import type {OutfitSelection} from '../../web/lib/product-preview';
import {isOutfitArtworkUrl} from '../../../shared/outfit-artwork';
import {SellerAiArtwork} from './seller-ai-artwork';
type Variant={id?:string;key:string;sku:string;color:string;size:string;image?:string};
export type OutfitArtwork=Record<string,unknown>;
export const readOutfitArtwork=(value:unknown):OutfitArtwork=>value&&typeof value==='object'&&!Array.isArray(value)?value as OutfitArtwork:{};
const forms=[['neutral','Trung tính'],['masculine','Nam'],['feminine','Nữ']] as const;
const record=(value:unknown)=>readOutfitArtwork(value);
export function validArtwork(value:OutfitArtwork){
 const maps=[record(value.overlays),...Object.values(record(value.variantOverlays)).map(record)];
 return maps.every(source=>Object.values(source).every(url=>url===''||isOutfitArtworkUrl(url)));
}
export function SellerOutfitArtwork({value,onChange,variants,name,disabled,onBusyChange,onPendingChange,productId}:{value:OutfitArtwork;onChange:(v:OutfitArtwork)=>void;variants:Variant[];name:string;disabled:boolean;onBusyChange:(v:boolean)=>void;onPendingChange:(v:boolean)=>void;productId?:string}){
 const [target,setTarget]=useState('');const [form,setForm]=useState<Avatar['form']>('neutral');const [pending,setPending]=useState(false);const [busy,setBusy]=useState(false);
 const saved=variants.filter(v=>v.id);const selected=saved.find(v=>v.id===target)||saved[0];const id=selected?.id||'';const map=record(value.variantOverlays);const overlays=record(map[id]);const current=typeof overlays[form]==='string'?String(overlays[form]):'';
 function update(url:string){if(!id)return;const next={...overlays};if(url.trim())next[form]=url.trim();else delete next[form];onChange({...value,variantOverlays:{...map,[id]:next}});}
 async function uploadArtwork(file:File){
  if(!['image/png','image/webp','image/avif'].includes(file.type))throw new Error('Artwork cần PNG, WebP hoặc AVIF có nền trong suốt.');
  const image=await createImageBitmap(file);
  try{if(image.width!==360||image.height!==620)throw new Error('Artwork cần khung 360 × 620 để mặc đúng vị trí.');const canvas=document.createElement('canvas');canvas.width=360;canvas.height=620;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Không kiểm tra được ảnh.');ctx.drawImage(image,0,0);if(ctx.getImageData(0,0,1,1).data[3]!==0||ctx.getImageData(359,0,1,1).data[3]!==0)throw new Error('Artwork cần nền trong suốt; hãy bỏ nền và khung hướng dẫn.');}finally{image.close();}
  return uploadSellerImage(file,'PRODUCT_IMAGE');
 }
 const chosen:Array<OutfitSelection|null>=Array(5).fill(null);if(selected)chosen[outfitSlot(name)??0]={product:{_id:'guide',slug:'guide',name,attributes:{outfitPreview:{...value,variantOverlays:{[id]:{[form]:current}}}}},variant:{_id:id,sku:selected.sku,price:0,attributes:{color:selected.color,size:selected.size}}};
 return <section className="seller-panel seller-form-card outfit-artwork-editor"><span className="eyebrow">DRESS UP / SKU ARTWORK</span><h2>Ảnh mặc thử 2D</h2><p className="seller-form-note">Gắn artwork của đúng sản phẩm, màu và dáng mẫu. Giữ logo/hoạ tiết đúng hàng bán; dùng PNG/WebP trong suốt trên khung 360 × 620. Đây là ảnh đặt sẵn trên mẫu, không dự đoán size vừa người.</p>
 {!saved.length?<p>Lưu sản phẩm và SKU trước để gắn artwork.</p>:<><label>SKU mặc thử<select aria-label="SKU mặc thử" value={id} disabled={disabled||pending||busy} onChange={e=>setTarget(e.target.value)}>{saved.map(v=><option key={v.id} value={v.id}>{v.sku} · {v.color} / {v.size}</option>)}</select></label><label>Dáng mẫu artwork<select aria-label="Dáng mẫu artwork" value={form} disabled={disabled||pending||busy} onChange={e=>setForm(e.target.value as Avatar['form'])}>{forms.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <a className="seller-secondary" href={'/outfit/guide-'+form+'.svg'} download>Tải khung mẫu 360 × 620</a><figure className="seller-artwork-reference">{selected?.image&&<><img src={selected.image} alt="Ảnh mặt hàng SKU đang chọn"/><figcaption>Ảnh mặt hàng để đối chiếu</figcaption></>}</figure><div className="seller-artwork-frame"><OutfitAvatar avatar={{...DEFAULT_AVATAR,form}} chosen={chosen} focus={null}/></div><label>URL artwork mặc thử<input value={current} disabled={disabled||pending||busy} placeholder="https://…/sku-front-transparent.png" onChange={e=>update(e.target.value)}/></label>
 <ImageUploader key={id+form} label="Upload artwork mặc thử" purpose="PRODUCT_IMAGE" disabled={disabled} upload={uploadArtwork} onBusyChange={v=>{setBusy(v);onBusyChange(v)}} onPendingChange={v=>{setPending(v);onPendingChange(v)}} onUploaded={update}/>
 <p className="seller-form-note">Ảnh SKU này ưu tiên hơn artwork chung của sản phẩm. Artwork trung tính dùng làm dự phòng cho các dáng chưa có ảnh. Bấm “Lưu thông tin” để lưu cùng sản phẩm và gửi duyệt theo quy trình hiện có.</p></>}
 {productId&&id&&<SellerAiArtwork key={productId+id+form} productId={productId} variantId={id} form={form} name={name} disabled={disabled||pending||busy} onApply={update} onBusyChange={onBusyChange}/>}
 </section>;
}
