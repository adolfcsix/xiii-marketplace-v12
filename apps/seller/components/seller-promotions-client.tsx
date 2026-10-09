'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { hasSellerSession, sellerApi } from '../lib/client-api';

type Product={_id:string;name:string;status:string;minPrice?:number};
type Paged<T>={items:T[];meta:{page:number;limit:number;total:number;totalPages:number}};
type Voucher={_id:string;name:string;code:string;type:'FIXED'|'PERCENT';value:number;maxDiscount?:number;minimumSpend:number;quantity:number;usedCount:number;perUserLimit:number;scope:string;productIds:string[];startAt:string;endAt:string;active:boolean;runtimeStatus:string};
type Campaign={_id:string;name:string;type:'FIXED'|'PERCENT';value:number;maxDiscount?:number;scope:string;productIds:string[];startAt:string;endAt:string;active:boolean;runtimeStatus:string};
const money=(n:number)=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
const dt=(value:string)=>new Date(value).toLocaleString('vi-VN');
const toIso=(value:FormDataEntryValue|null)=>new Date(String(value)).toISOString();
const defaultStart=()=>new Date(Date.now()+5*60_000).toISOString().slice(0,16);
const defaultEnd=()=>new Date(Date.now()+7*86400000).toISOString().slice(0,16);

export function SellerPromotionsClient(){
  const [tab,setTab]=useState<'voucher'|'campaign'>('voucher'); const [vouchers,setVouchers]=useState<Voucher[]>([]); const [campaigns,setCampaigns]=useState<Campaign[]>([]); const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [showCreate,setShowCreate]=useState(false);
  const [scope,setScope]=useState<'ALL_PRODUCTS'|'SELECTED_PRODUCTS'>('ALL_PRODUCTS'); const [selected,setSelected]=useState<string[]>([]);

  const load=useCallback(async()=>{
    if(!hasSellerSession()){window.location.href='/login';return;}
    setLoading(true);setMessage('');
    try{
      const [v,c,p]=await Promise.all([
        sellerApi<Paged<Voucher>>('/seller/promotions/vouchers?limit=100'),
        sellerApi<Paged<Campaign>>('/seller/promotions/campaigns?limit=100'),
        sellerApi<Paged<Product>>('/seller/products?status=ACTIVE&limit=100'),
      ]);setVouchers(v.items);setCampaigns(c.items);setProducts(p.items);
    }catch(err){setMessage(err instanceof Error?err.message:'Không tải được khuyến mãi');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const activeCount=useMemo(()=>[...vouchers,...campaigns].filter(x=>x.runtimeStatus==='ACTIVE').length,[vouchers,campaigns]);

  function toggleProduct(id:string){setSelected(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id]);}
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage('');const f=new FormData(e.currentTarget);
    try{
      const common={name:String(f.get('name')||'').trim(),type:String(f.get('type')),value:Number(f.get('value')),maxDiscount:f.get('maxDiscount')?Number(f.get('maxDiscount')):undefined,scope,productIds:scope==='SELECTED_PRODUCTS'?selected:[],startAt:toIso(f.get('startAt')),endAt:toIso(f.get('endAt')),active:true};
      if(scope==='SELECTED_PRODUCTS'&&!selected.length)throw new Error('Hãy chọn ít nhất một sản phẩm.');
      if(tab==='voucher') await sellerApi('/seller/promotions/vouchers',{method:'POST',body:JSON.stringify({...common,code:String(f.get('code')||'').trim().toUpperCase(),minimumSpend:Number(f.get('minimumSpend')||0),quantity:Number(f.get('quantity')||0),perUserLimit:Number(f.get('perUserLimit')||1)})});
      else await sellerApi('/seller/promotions/campaigns',{method:'POST',body:JSON.stringify(common)});
      setShowCreate(false);setSelected([]);setScope(tab==='voucher'?'ALL_PRODUCTS':'SELECTED_PRODUCTS');await load();
    }catch(err){setMessage(err instanceof Error?err.message:'Không tạo được chương trình');}
    finally{setBusy(false);}
  }
  async function toggle(kind:'vouchers'|'campaigns',id:string,active:boolean){setBusy(true);try{await sellerApi(`/seller/promotions/${kind}/${id}/toggle`,{method:'PATCH',body:JSON.stringify({active})});await load();}catch(err){setMessage(err instanceof Error?err.message:'Không cập nhật được');}finally{setBusy(false);}}
  async function archive(kind:'vouchers'|'campaigns',id:string){if(!confirm('Ẩn chương trình này khỏi Seller Center? Dữ liệu lịch sử vẫn được giữ.'))return;setBusy(true);try{await sellerApi(`/seller/promotions/${kind}/${id}`,{method:'DELETE'});await load();}catch(err){setMessage(err instanceof Error?err.message:'Không thể lưu trữ');}finally{setBusy(false);}}

  return <>
    <div className="seller-page-head"><div><span>PROMOTIONS</span><h1>Khuyến mãi</h1><p>Tạo voucher shop và chiến dịch giảm giá tự động. Checkout sẽ kiểm tra điều kiện lại ở backend.</p></div><button className="seller-primary" onClick={()=>setShowCreate(v=>!v)}>{showCreate?'Đóng form':'+ Tạo chương trình'}</button></div>
    <section className="seller-kpis promo-kpis"><article><small>Đang hoạt động</small><strong>{activeCount}</strong><span>Voucher + campaign</span></article><article><small>Voucher shop</small><strong>{vouchers.length}</strong><span>{vouchers.reduce((s,v)=>s+v.usedCount,0)} lượt đã dùng</span></article><article><small>Campaign</small><strong>{campaigns.length}</strong><span>Giảm giá tự động theo sản phẩm</span></article><article><small>Sản phẩm ACTIVE</small><strong>{products.length}</strong><span>Có thể đưa vào campaign</span></article></section>
    {message&&<div className="seller-alert">{message}</div>}

    {showCreate&&<section className="seller-panel promo-create"><div className="seller-panel-head"><div><span>CREATE</span><h2>{tab==='voucher'?'Tạo voucher shop':'Tạo campaign giảm giá'}</h2></div></div><form onSubmit={submit}>
      <label>Tên chương trình<input name="name" required maxLength={100} placeholder={tab==='voucher'?'Voucher khách mới':'Weekend Street Sale'}/></label>
      {tab==='voucher'&&<label>Mã voucher<input name="code" required minLength={4} maxLength={30} placeholder="XIII50" onInput={e=>{e.currentTarget.value=e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')}}/></label>}
      <label>Kiểu giảm<select name="type"><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền cố định</option></select></label>
      <label>Giá trị<input name="value" type="number" min="1" required placeholder="10"/></label>
      <label>Giảm tối đa<input name="maxDiscount" type="number" min="0" placeholder="100000"/></label>
      {tab==='voucher'&&<><label>Đơn tối thiểu<input name="minimumSpend" type="number" min="0" defaultValue="0"/></label><label>Tổng lượt dùng<input name="quantity" type="number" min="0" defaultValue="0"/><small>0 = không giới hạn</small></label><label>Giới hạn / người<input name="perUserLimit" type="number" min="1" max="100" defaultValue="1"/></label></>}
      <label>Bắt đầu<input name="startAt" type="datetime-local" defaultValue={defaultStart()} required/></label><label>Kết thúc<input name="endAt" type="datetime-local" defaultValue={defaultEnd()} required/></label>
      <label>Phạm vi<select value={scope} onChange={e=>{setScope(e.target.value as any);setSelected([])}}><option value="ALL_PRODUCTS">Toàn shop</option><option value="SELECTED_PRODUCTS">Sản phẩm được chọn</option></select></label>
      {scope==='SELECTED_PRODUCTS'&&<div className="promo-product-picker"><b>Chọn sản phẩm</b>{products.map(p=><label key={p._id}><input type="checkbox" checked={selected.includes(p._id)} onChange={()=>toggleProduct(p._id)}/><span>{p.name}</span><small>{p.minPrice?money(p.minPrice):p.status}</small></label>)}</div>}
      <button className="seller-primary" disabled={busy}>{busy?'Đang lưu…':'Tạo chương trình'}</button>
    </form></section>}

    <div className="promo-tabs"><button className={tab==='voucher'?'active':''} onClick={()=>{setTab('voucher');setShowCreate(false);setScope('ALL_PRODUCTS');setSelected([])}}>Voucher shop</button><button className={tab==='campaign'?'active':''} onClick={()=>{setTab('campaign');setShowCreate(false);setScope('SELECTED_PRODUCTS');setSelected([])}}>Campaign giảm giá</button></div>
    {loading?<div className="seller-loading">Đang tải khuyến mãi…</div>:tab==='voucher'?<section className="promo-list">{vouchers.length?vouchers.map(v=><article key={v._id}><header><div><span className={'seller-badge promo-'+v.runtimeStatus.toLowerCase()}>{v.runtimeStatus}</span><h3>{v.name}</h3><strong>{v.code}</strong></div><div><button onClick={()=>toggle('vouchers',v._id,!v.active)} disabled={busy}>{v.active?'Tạm dừng':'Bật lại'}</button><button className="danger" onClick={()=>archive('vouchers',v._id)} disabled={busy}>Lưu trữ</button></div></header><div className="promo-metrics"><span><small>Mức giảm</small><b>{v.type==='PERCENT'?`${v.value}%${v.maxDiscount?` · max ${money(v.maxDiscount)}`:''}`:money(v.value)}</b></span><span><small>Đơn tối thiểu</small><b>{money(v.minimumSpend)}</b></span><span><small>Đã dùng</small><b>{v.usedCount}/{v.quantity||'∞'}</b></span><span><small>Mỗi buyer</small><b>{v.perUserLimit} lượt</b></span></div><footer><span>{v.scope==='ALL_PRODUCTS'?'Toàn shop':`${v.productIds.length} sản phẩm`}</span><span>{dt(v.startAt)} → {dt(v.endAt)}</span></footer></article>):<div className="seller-empty">Chưa có voucher shop.</div>}</section>
      :<section className="promo-list">{campaigns.length?campaigns.map(c=><article key={c._id}><header><div><span className={'seller-badge promo-'+c.runtimeStatus.toLowerCase()}>{c.runtimeStatus}</span><h3>{c.name}</h3><strong>{c.type==='PERCENT'?`-${c.value}%`:`-${money(c.value)}`}</strong></div><div><button onClick={()=>toggle('campaigns',c._id,!c.active)} disabled={busy}>{c.active?'Tạm dừng':'Bật lại'}</button><button className="danger" onClick={()=>archive('campaigns',c._id)} disabled={busy}>Lưu trữ</button></div></header><div className="promo-metrics"><span><small>Kiểu</small><b>{c.type}</b></span><span><small>Giảm tối đa</small><b>{c.maxDiscount?money(c.maxDiscount):'Không giới hạn'}</b></span><span><small>Phạm vi</small><b>{c.scope==='ALL_PRODUCTS'?'Toàn shop':`${c.productIds.length} sản phẩm`}</b></span><span><small>Stack</small><b>+ voucher shop</b></span></div><footer><span>Giảm tự động ở Checkout</span><span>{dt(c.startAt)} → {dt(c.endAt)}</span></footer></article>):<div className="seller-empty">Chưa có campaign.</div>}</section>}
  </>;
}
