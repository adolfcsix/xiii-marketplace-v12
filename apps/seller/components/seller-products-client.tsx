'use client';
import {BUYER_STORE_URL} from '../../../shared/app-links';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { hasSellerSession, sellerApi } from '../lib/client-api';
import { SellerShell } from './seller-shell';

const money=(n?:number)=>n===undefined||n===null?'—':new Intl.NumberFormat('vi-VN').format(n)+'₫';
const STATUS:Record<string,{label:string;className:string}>={
  DRAFT:{label:'Bản nháp',className:'draft'},PENDING_REVIEW:{label:'Chờ duyệt',className:'pending_review'},ACTIVE:{label:'Đang bán',className:'active'},
  REJECTED:{label:'Bị từ chối',className:'rejected'},HIDDEN:{label:'Đã ẩn',className:'hidden'},
};
type Row={_id:string;name:string;slug:string;status:string;images:string[];shortDescription?:string;ratingAverage:number;ratingCount:number;soldCount:number;viewCount:number;variantCount:number;activeVariantCount:number;minPrice?:number;maxPrice?:number;availableStock:number;reservedStock:number;lowStockCount:number;category?:{name:string};brand?:{name:string};createdAt:string};
type Data={items:Row[];meta:{page:number;limit:number;total:number;totalPages:number}};
type Summary={total:number;counts:Record<string,number>;totalAvailable:number;lowStock:number;outOfStock:number};
const TABS=[['ALL','Tất cả'],['ACTIVE','Đang bán'],['DRAFT','Bản nháp'],['PENDING_REVIEW','Chờ duyệt'],['REJECTED','Bị từ chối'],['HIDDEN','Đã ẩn']];

export function SellerProductsClient(){
  const [data,setData]=useState<Data|null>(null);const [summary,setSummary]=useState<Summary|null>(null);const [status,setStatus]=useState('ALL');const [query,setQuery]=useState('');const [search,setSearch]=useState('');const [page,setPage]=useState(1);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const load=useCallback(async()=>{if(!hasSellerSession()){window.location.href='/login?next=%2Fproducts';return;}setLoading(true);setError('');try{const qs=new URLSearchParams({status,page:String(page),limit:'20'});if(search)qs.set('q',search);const [list,sum]=await Promise.all([sellerApi<Data>('/seller/products?'+qs),sellerApi<Summary>('/seller/products/summary')]);setData(list);setSummary(sum);}catch(e){setError(e instanceof Error?e.message:'Không tải được sản phẩm');}finally{setLoading(false);}},[status,page,search]);
  useEffect(()=>{load();},[load]);
  function submit(e:FormEvent){e.preventDefault();setPage(1);setSearch(query.trim());}
  async function hideProduct(id:string,name:string){if(!confirm(`Ẩn “${name}”? Sản phẩm sẽ biến mất khỏi Buyer Store nhưng dữ liệu đơn cũ vẫn được giữ.`))return;try{await sellerApi('/seller/products/'+id,{method:'DELETE'});await load();}catch(e){setError(e instanceof Error?e.message:'Không thể ẩn sản phẩm');}}
  return <SellerShell active="products">
    <section className="seller-page-head"><div><span>CATALOG</span><h1>Quản lý sản phẩm</h1><p>Catalog thật của shop: Product → Variant/SKU → Inventory.</p></div><a className="seller-primary" href="/products/new">+ Thêm sản phẩm</a></section>
    <div className="seller-kpis seller-kpis-products">
      <article><small>Tổng sản phẩm</small><strong>{summary?.total??'—'}</strong><span>{summary?.counts?.ACTIVE||0} đang bán</span></article>
      <article><small>Tồn có thể bán</small><strong>{summary?.totalAvailable??'—'}</strong><span>Tổng available của mọi SKU</span></article>
      <article><small>SKU sắp hết</small><strong>{summary?.lowStock??'—'}</strong><span>Available ≤ ngưỡng cảnh báo</span></article>
      <article><small>SKU hết hàng</small><strong>{summary?.outOfStock??'—'}</strong><span>Cần bổ sung tồn kho</span></article>
    </div>
    <section className="seller-panel seller-catalog-panel">
      <div className="seller-catalog-toolbar"><div className="seller-order-tabs">{TABS.map(([key,label])=><button key={key} className={status===key?'active':''} onClick={()=>{setStatus(key);setPage(1)}}>{label}{key!=='ALL'&&<em>{summary?.counts?.[key]||0}</em>}</button>)}</div><form onSubmit={submit} className="seller-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên sản phẩm…"/><button>Tìm</button></form></div>
      {error&&<div className="seller-alert">{error}</div>}
      {loading?<div className="seller-loading">Đang tải catalog…</div>:data?.items.length?<div className="seller-product-table-wrap"><table className="seller-product-table"><thead><tr><th>Sản phẩm</th><th>Giá bán</th><th>SKU</th><th>Tồn kho</th><th>Hiệu suất</th><th>Trạng thái</th><th></th></tr></thead><tbody>{data.items.map(row=>{const st=STATUS[row.status]||{label:row.status,className:'hidden'};return <tr key={row._id}><td><div className="seller-product-cell"><img src={row.images?.[0]||'/products/fallback.svg'} alt=""/><div><b>{row.name}</b><small>{row.category?.name||'Chưa phân loại'}{row.brand?.name?' · '+row.brand.name:''}</small><small>{row.shortDescription||row.slug}</small></div></div></td><td><b>{money(row.minPrice)}</b>{row.maxPrice!==undefined&&row.maxPrice!==row.minPrice&&<small className="seller-table-sub">→ {money(row.maxPrice)}</small>}</td><td><b>{row.activeVariantCount}/{row.variantCount}</b><small className="seller-table-sub">đang bật</small></td><td><b>{row.availableStock}</b>{row.lowStockCount>0&&<small className="seller-stock-warning">{row.lowStockCount} SKU sắp hết</small>}<small className="seller-table-sub">{row.reservedStock} đang giữ</small></td><td><b>{row.soldCount} đã bán</b><small className="seller-table-sub">{row.viewCount} lượt xem · ★ {row.ratingAverage?.toFixed?.(1)||'0.0'}</small></td><td><span className={'seller-product-status '+st.className}>{st.label}</span></td><td><div className="seller-row-actions"><a href={'/products/'+row._id}>Chỉnh sửa</a>{row.status==='ACTIVE'&&<a href={BUYER_STORE_URL+'/product/'+row.slug} target="_blank">Xem shop ↗</a>}{row.status!=='HIDDEN'&&<button onClick={()=>hideProduct(row._id,row.name)}>Ẩn</button>}</div></td></tr>})}</tbody></table></div>:<div className="seller-empty"><h2>Chưa có sản phẩm</h2><p>Tạo sản phẩm đầu tiên với SKU và tồn kho thật.</p><a className="seller-primary" href="/products/new">+ Thêm sản phẩm</a></div>}
      {data&&data.meta.totalPages>1&&<div className="seller-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Trước</button><span>Trang {page}/{data.meta.totalPages}</span><button disabled={page>=data.meta.totalPages} onClick={()=>setPage(p=>p+1)}>Sau →</button></div>}
    </section>
  </SellerShell>;
}
