'use client';
import {celebrateCart} from '../lib/cart-motion';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toggleWishlist, useWishlist } from '../lib/wishlist';
import { BagIcon, StarIcon, TruckIcon } from './icons';
import { SizeAdvisor } from './size-advisor';
import { ProductGallery } from './product-gallery';
import { ClientApiError, clientApi, emitCartUpdated, hasSession } from '../lib/client-api';

export type DetailVariant = {
  _id: string;
  sku: string;
  attributes: Record<string,string>;
  price: number;
  compareAtPrice?: number;
  image?: string;
  available?: number;
  reserved?: number;
  sold?: number;
};

export type DetailProduct = {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  images?: string[];
  attributes?: Record<string,unknown>;
  ratingAverage?: number;
  ratingCount?: number;
  soldCount?: number;
  brand?: { name?: string; slug?: string; verified?: boolean } | null;
  category?: { name?: string; slug?: string } | null;
  shop?: {
    _id?: string; name?: string; slug?: string; verified?: boolean; ratingAverage?: number; ratingCount?: number;
    followerCount?: number; productCount?: number; responseRate?: number; description?: string;
    address?: Record<string,string>;
  } | null;
};

const money=(n?:number)=>n===undefined?'—':new Intl.NumberFormat('vi-VN').format(n)+'₫';
const uniq=(items:string[])=>Array.from(new Set(items.filter(Boolean)));
type PublicPromotion={vouchers:Array<{_id:string;name:string;code:string;type:string;value:number;maxDiscount?:number;minimumSpend:number;scope:string;productIds:string[];endAt:string}>;campaigns:Array<{_id:string;name:string;type:'FIXED'|'PERCENT';value:number;maxDiscount?:number;scope:string;productIds:string[];endAt:string}>};

export function ProductDetailClient({product,variants}:{product:DetailProduct;variants:DetailVariant[]}){
  const colors=uniq(variants.map(v=>v.attributes?.color || 'Default'));
  const sizes=uniq(variants.map(v=>v.attributes?.size || 'Free'));
  const [color,setColor]=useState(colors[0] || 'Default');
  const initialForColor=variants.find(v=>(v.attributes?.color||'Default')===(colors[0]||'Default')) || variants[0];
  const [size,setSize]=useState(initialForColor?.attributes?.size || sizes[0] || 'Free');
  const [quantity,setQuantity]=useState(1);
  const {items:wishlist}=useWishlist();
  const saved=wishlist.some(p=>p._id===product._id);
  const [adding,setAdding]=useState(false);
  const addingRef=useRef(false);
  const detailRoot=useRef<HTMLElement>(null);
  const chattingRef=useRef(false);const [chatting,setChatting]=useState(false);
  const [notice,setNotice]=useState('');
  const [promotions,setPromotions]=useState<PublicPromotion>({vouchers:[],campaigns:[]});

  useEffect(()=>{if(product.shop?._id)clientApi<PublicPromotion>('/promotions/shop/'+product.shop._id).then(setPromotions).catch(()=>{});},[product.shop?._id]);

  const selected=useMemo(()=>{
    return variants.find(v=>(v.attributes?.color||'Default')===color && (v.attributes?.size||'Free')===size)
      || variants.find(v=>(v.attributes?.color||'Default')===color)
      || variants[0];
  },[variants,color,size]);

  const availableSizes=useMemo(()=>uniq(variants.filter(v=>(v.attributes?.color||'Default')===color).map(v=>v.attributes?.size||'Free')),[variants,color]);
  const price=selected?.price;
  const compare=selected?.compareAtPrice;
  const eligibleCampaigns=promotions.campaigns.filter(c=>c.scope==='ALL_PRODUCTS'||c.productIds.some(id=>id===product._id));
  const bestCampaign=price?eligibleCampaigns.map(c=>{const raw=c.type==='PERCENT'?Math.floor(price*c.value/100):c.value;return {campaign:c,discount:Math.min(price,c.maxDiscount?Math.min(raw,c.maxDiscount):raw)}}).sort((a,b)=>b.discount-a.discount)[0]:undefined;
  const campaignPrice=price===undefined?undefined:Math.max(0,price-(bestCampaign?.discount||0));
  const priceBase=compare&&compare>(price||0)?compare:price;
  const discount=campaignPrice!==undefined&&priceBase&&priceBase>campaignPrice?Math.round((1-campaignPrice/priceBase)*100):0;
  const available=selected?.available ?? 0;
  useEffect(()=>{setQuantity(1);},[selected?._id]);
  const gallery=uniq([selected?.image || '', ...(product.images || [])]);

  function chooseColor(next:string){
    setColor(next);
    const options=variants.filter(v=>(v.attributes?.color||'Default')===next);
    if(!options.some(v=>(v.attributes?.size||'Free')===size)) setSize(options[0]?.attributes?.size||'Free');
  }

  async function startChat(){
    if(chattingRef.current)return;
    if(!hasSession()){window.location.href='/login?next='+encodeURIComponent(window.location.pathname);return;}
    if(!product.shop?._id){setNotice('Không tìm thấy shop để mở chat.');return;}
    chattingRef.current=true;setChatting(true);
    try{const c=await clientApi<{_id:string}>('/chat/conversations',{method:'POST',body:JSON.stringify({shopId:product.shop._id,productId:product._id})});window.location.href='/account/messages?conversation='+encodeURIComponent(c._id);}catch(err){setNotice(err instanceof Error?err.message:'Không thể mở chat với shop');}finally{chattingRef.current=false;setChatting(false);}
  }

  async function addToBag(goToCart=false){
    if(addingRef.current)return;
    if(!hasSession()){window.location.href='/login?next='+encodeURIComponent(window.location.pathname);return;}
    if(quantity>Math.min(available,99)){setNotice('Vui lòng giảm số lượng theo tồn kho hiện tại.');return;}
    if(!selected || available<=0){setNotice('Biến thể này đang hết hàng.');return;}
    addingRef.current=true;setAdding(true);
    try{
      await clientApi('/cart/items',{method:'POST',body:JSON.stringify({variantId:selected._id,quantity})});
      emitCartUpdated();
      if(goToCart){window.location.href='/cart';return;}
      celebrateCart(detailRoot.current?.querySelector('.gallery-open img')||null);
      setNotice(`Đã thêm ${product.name} · ${color} / ${size} × ${quantity} vào giỏ.`);
    }catch(err){
      if(err instanceof ClientApiError && err.status===401){window.location.href='/login?next='+encodeURIComponent(window.location.pathname);return;}
      setNotice(err instanceof Error?err.message:'Không thể thêm vào giỏ');
    }
    finally{addingRef.current=false;setAdding(false);}
  }

  return <>
    <section className="detail-main-grid" ref={detailRoot}>
      <ProductGallery key={selected?._id} images={gallery} name={product.name} discount={discount} saved={saved} onSave={()=>{if(!toggleWishlist({_id:product._id,name:product.name,slug:product.slug,image:product.images?.[0],price,ratingAverage:product.ratingAverage,ratingCount:product.ratingCount,brand:product.brand?.name}))setNotice('Không lưu được yêu thích. Hãy cho phép lưu dữ liệu trình duyệt.');}}/>

      <div className="detail-buy-panel">
        <div className="detail-brand-row">
          <a href={product.brand?.slug?'/search?brand='+encodeURIComponent(product.brand.slug):'/search'}>{product.brand?.name || product.shop?.name || 'XIII Official'} {product.brand?.verified||product.shop?.verified?<span>✓</span>:null}</a>
          <div><StarIcon size={14}/><b>{(product.ratingAverage||0).toFixed(1)}</b><span>({new Intl.NumberFormat('vi-VN').format(product.ratingCount||0)})</span><i>·</i><span>Đã bán {new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(product.soldCount||0)}</span></div>
        </div>
        <h1>{product.name}</h1>
        <p className="detail-short">{product.shortDescription || product.description}</p>
        <div className="detail-price"><strong>{money(campaignPrice)}</strong>{price!==campaignPrice?<del>{money(price)}</del>:compare&&compare>(price||0)?<del>{money(compare)}</del>:null}{discount>0?<span>Tiết kiệm {discount}%</span>:null}</div>
        {bestCampaign&&<div className="detail-campaign-note"><b>{bestCampaign.campaign.name}</b><span>Giảm tự động {bestCampaign.campaign.type==='PERCENT'?bestCampaign.campaign.value+'%':money(bestCampaign.campaign.value)} khi checkout.</span></div>}

        {promotions.vouchers.length>0&&<div className="detail-vouchers">{promotions.vouchers.slice(0,3).map(v=><div key={v._id}><span>SHOP VOUCHER</span><b>{v.code}</b><small>{v.type==='PERCENT'?`Giảm ${v.value}%${v.maxDiscount?`, tối đa ${money(v.maxDiscount)}`:''}`:`Giảm ${money(v.value)}`} · đơn từ {money(v.minimumSpend)}</small></div>)}</div>}

        <div className="detail-option-block">
          <div className="detail-option-heading"><b>Màu sắc</b><span>{color}</span></div>
          <div className="detail-color-options">{colors.map(c=><button key={c} className={color===c?'active':''} aria-pressed={color===c} disabled={adding} onClick={()=>chooseColor(c)}><i aria-hidden="true" className={'swatch swatch-'+c.toLowerCase().replace(/\s+/g,'-')}/><span>{c}</span></button>)}</div>
        </div>

        <div className="detail-option-block">
          <div className="detail-option-heading"><b>Kích thước</b><a href="#size-guide">Hướng dẫn chọn size</a></div>
          <div className="detail-size-options">{sizes.map(s=>{const enabled=availableSizes.includes(s);return <button disabled={!enabled||adding} aria-pressed={size===s&&enabled} className={size===s&&enabled?'active':''} key={s} onClick={()=>enabled&&setSize(s)}>{s}</button>})}</div>
          <small className={available<=10?'low-stock':''}>{available>0?(available<=10?`Chỉ còn ${available} sản phẩm cho lựa chọn này`:`Còn ${available} sản phẩm trong kho`):'Tạm hết hàng'}</small>
        </div>

        <SizeAdvisor disabled={adding} chart={product.attributes?.sizeChart} sizes={variants.filter(v=>(v.attributes?.color||'Default')===color&&(v.available??0)>0).map(v=>v.attributes?.size||'Free')} onSelect={next=>{if(!adding)setSize(next);}}/>
        <div className="detail-qty-row"><b>Số lượng</b><div><button aria-label="Giảm số lượng" disabled={adding||quantity<=1} onClick={()=>setQuantity(Math.max(1,quantity-1))}>−</button><span>{quantity}</span><button aria-label="Tăng số lượng" disabled={adding||quantity>=Math.min(available,99)} onClick={()=>setQuantity(Math.min(Math.max(available,1),99,quantity+1))}>+</button></div><em>SKU: {selected?.sku || '—'}</em></div>
        <div className="detail-actions"><button className="detail-add" aria-busy={adding} onClick={()=>addToBag(false)} disabled={adding||available<=0}><BagIcon size={19}/>{adding?'Đang thêm…':'Thêm vào giỏ'}</button><button className="detail-buy" aria-busy={adding} onClick={()=>addToBag(true)} disabled={adding||available<=0}>Mua ngay</button></div>
        {notice&&<div className="detail-notice" role="status">{notice}</div>}

        <div className="detail-benefits">
          <div><TruckIcon size={21}/><span><b>Giao hàng toàn quốc</b><small>Dự kiến 2–4 ngày làm việc</small></span></div>
          <div><span className="benefit-mini">↺</span><span><b>Đổi trả 7 ngày</b><small>Áp dụng theo chính sách XIII</small></span></div>
          <div><span className="benefit-mini">✓</span><span><b>Buyer Protection</b><small>Thanh toán được bảo vệ bởi sàn</small></span></div>
        </div>
      </div>
    </section>

    <section className="detail-shop-card">
      <div className="detail-shop-avatar">{(product.shop?.name||'XIII').slice(0,4).toUpperCase()}</div>
      <div className="detail-shop-copy"><div><h3>{product.shop?.name || 'XIII Official'} {product.shop?.verified?<span>✓</span>:null}</h3><p>{product.shop?.description || 'Local streetwear store on XIII Marketplace.'}</p></div><div className="detail-shop-stats"><span><b>{(product.shop?.ratingAverage||0).toFixed(1)}</b><small>Đánh giá</small></span><span><b>{new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(product.shop?.followerCount||0)}</b><small>Người theo dõi</small></span><span><b>{product.shop?.responseRate||0}%</b><small>Phản hồi chat</small></span><span><b>{product.shop?.productCount||0}</b><small>Sản phẩm</small></span></div></div>
      <div className="detail-shop-actions"><a href={product.shop?._id?'/search?shop='+encodeURIComponent(product.shop._id):'/search'}>Xem gian hàng</a><button onClick={startChat} disabled={chatting}>{chatting?'Đang mở chat…':'Chat với shop'}</button></div>
    </section>
  </>;
}
