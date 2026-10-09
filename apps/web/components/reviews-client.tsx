'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {ImageUploader} from '../../../shared/image-uploader';
import {uploadBuyerImage} from '../lib/upload';
import { clientApi, hasSession } from '../lib/client-api';

type Pending={_id:string;productName:string;image?:string;variantSnapshot?:Record<string,any>;product?:{name:string;slug:string;images?:string[]};order?:{orderCode:string;completedAt?:string}};
type Review={media?:string[];_id:string;rating:number;comment:string;status:string;sellerReply?:string;createdAt:string;product?:{name:string;slug:string;images?:string[]};verifiedPurchase:boolean};
type PageData<T>={items:T[];meta:{total:number;page:number;totalPages:number}};
const stars=(n:number)=>'★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);
export function ReviewsClient(){
  const [tab,setTab]=useState<'PENDING'|'REVIEWED'>('PENDING');const [data,setData]=useState<PageData<any>|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState('');
  const [loading,setLoading]=useState(true);const loadVersion=useRef(0),controller=useRef<AbortController|null>(null);
  const [editing,setEditing]=useState<Pending|null>(null);const [rating,setRating]=useState(5);const [comment,setComment]=useState('');const dialog=useRef<HTMLDialogElement>(null);const submitting=useRef(false);
  const [media,setMedia]=useState<string[]>([]),[uploading,setUploading]=useState(false),[pendingImages,setPendingImages]=useState(false);
  useEffect(()=>{if(editing)dialog.current?.showModal();else dialog.current?.close();},[editing]);
  const load=useCallback(async()=>{
    if(!hasSession()){location.href='/login?next=%2Faccount%2Freviews';return;}
    controller.current?.abort();const request=new AbortController();controller.current=request;const version=++loadVersion.current;
    setLoading(true);setError('');setData(null);
    try{const result=await clientApi<PageData<any>>(`/reviews/mine?status=${tab}&limit=50`,{signal:request.signal});if(!request.signal.aborted&&version===loadVersion.current)setData(result);}
    catch(e){if(!request.signal.aborted&&version===loadVersion.current)setError(e instanceof Error?e.message:'Không tải được đánh giá');}
    finally{if(!request.signal.aborted&&version===loadVersion.current)setLoading(false);}
  },[tab]);
  useEffect(()=>{void load();return()=>{controller.current?.abort();loadVersion.current++;};},[load]);
  async function create(event:React.FormEvent){
    event.preventDefault();if(!editing||submitting.current||uploading||pendingImages)return;submitting.current=true;setBusy(editing._id);setError('');
    try{await clientApi('/reviews',{method:'POST',body:JSON.stringify({orderItemId:editing._id,rating,comment:comment.trim(),media})});setEditing(null);await load();}
    catch(error){setError(error instanceof Error?error.message:'Không gửi được đánh giá');}
    finally{submitting.current=false;setBusy('');}
  }

  return <section className="buyer-reviews"><header><div><span>VERIFIED PURCHASE REVIEWS</span><h1>Đánh giá của tôi</h1><p>Chỉ sản phẩm thuộc đơn đã hoàn tất mới có thể đánh giá.</p></div><a href="/account/orders">Đơn mua →</a></header><div className="review-tabs"><button className={tab==='PENDING'?'active':''} onClick={()=>setTab('PENDING')}>Chờ đánh giá</button><button className={tab==='REVIEWED'?'active':''} onClick={()=>setTab('REVIEWED')}>Đã đánh giá</button></div>{error&&!editing&&<div className="review-alert" role="alert">{error}</div>}{loading?<div className="review-empty" role="status">Đang tải…</div>:!data?<div className="review-empty"><b>Chưa tải được đánh giá.</b><button className="account-retry" onClick={()=>void load()}>Thử lại</button></div>:data.items.length===0?<div className="review-empty"><b>Không có mục nào.</b><span>{tab==='PENDING'?'Các sản phẩm từ đơn đã hoàn tất sẽ xuất hiện ở đây.':'Bạn chưa có đánh giá nào.'}</span></div>:<div className="review-list">{tab==='PENDING'?data.items.map((i:Pending)=><article key={i._id}><img src={i.image||i.product?.images?.[0]||'/products/fallback.svg'} alt=""/><div><b>{i.product?.name||i.productName}</b><small>{i.order?.orderCode||'Đơn hàng'} · {String(i.variantSnapshot?.attributes?.color||'')} {String(i.variantSnapshot?.attributes?.size||'')}</small><span className="verified-chip">✓ Đã mua hàng</span></div><button disabled={busy===i._id} onClick={()=>{setEditing(i);setMedia([]);setPendingImages(false);setRating(5);setComment('');setError('');}}>Đánh giá</button></article>):data.items.map((r:Review)=><article key={r._id}><img src={r.product?.images?.[0]||'/products/fallback.svg'} alt=""/><div><b>{r.product?.name||'Sản phẩm'}</b><strong className="review-stars">{stars(r.rating)}</strong><p>{r.comment||'Không có nhận xét bằng chữ.'}</p>{r.media?.length?<div className="attached-images">{r.media.map((url,i)=><a key={url+i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={'Ảnh đánh giá '+(i+1)}/></a>)}</div>:null}{r.sellerReply&&<blockquote><b>Phản hồi từ shop</b>{r.sellerReply}</blockquote>}<small>{r.status==='HIDDEN'?'Đánh giá đã bị ẩn bởi kiểm duyệt':'✓ Verified Purchase'}</small></div><a href={r.product?.slug?'/product/'+r.product.slug:'#'}>Xem sản phẩm</a></article>)}</div>}<dialog ref={dialog} className="review-dialog" aria-labelledby="review-dialog-title" onCancel={event=>{if(submitting.current||uploading)event.preventDefault();else setEditing(null);}} onClose={()=>setEditing(null)}>
    <form onSubmit={create}><div className="review-dialog-heading"><div><span>CHIA SẺ TRẢI NGHIỆM</span><h2 id="review-dialog-title">Đánh giá sản phẩm</h2></div><button type="button" aria-label="Đóng đánh giá" disabled={Boolean(busy)||uploading} onClick={()=>setEditing(null)}>×</button></div><p>{editing?.product?.name||editing?.productName}</p>
    <fieldset className="review-rating-input"><legend>Mức độ hài lòng</legend>{[1,2,3,4,5].map(value=><label key={value}><input type="radio" name="rating" value={value} checked={rating===value} onChange={()=>setRating(value)} disabled={Boolean(busy)||uploading} aria-label={value+' sao'}/><span aria-hidden="true" className={value<=rating?'selected':''}>★</span></label>)}</fieldset>
    <label className="review-comment-label">Nhận xét của bạn<textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={2000} rows={5} placeholder="Chất liệu, kích thước và trải nghiệm khi nhận hàng…" disabled={Boolean(busy)||uploading}/><small>{comment.length}/2000 ký tự</small></label>{editing&&<ImageUploader key={editing._id} label="Upload ảnh đánh giá" purpose="REVIEW_IMAGE" multiple maxFiles={6-media.length} disabled={Boolean(busy)||uploading} upload={file=>uploadBuyerImage(file,'REVIEW_IMAGE')} onBusyChange={setUploading} onPendingChange={setPendingImages} onUploaded={url=>setMedia(v=>[...v,url])}/>}<small>Tối đa 6 ảnh. Tải hoặc bỏ ảnh đã chọn trước khi gửi đánh giá.</small><div className="attached-images">{media.map((url,i)=><div key={url+i}><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={'Ảnh đánh giá '+(i+1)}/></a><button type="button" disabled={Boolean(busy)||uploading} aria-label={'Xóa ảnh đánh giá '+(i+1)} onClick={()=>setMedia(v=>v.filter((_,n)=>n!==i))}>Xóa</button></div>)}</div>{error&&<div className="review-alert" role="alert">{error}</div>}<button className="review-submit" disabled={Boolean(busy)||uploading||pendingImages}>{busy?'Đang gửi…':'Gửi đánh giá'}</button></form>
  </dialog></section>;
}
