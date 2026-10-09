'use client';
import Link from 'next/link';
import { SiteHeader } from '../../components/site-header';
import { ProductCard } from '../../components/product-card';
import { useWishlist } from '../../lib/wishlist';
export default function WishlistPage(){
  const {items,ready}=useWishlist();
  return <><SiteHeader/><main className="home-shell wishlist-page"><div className="collection-heading"><span>YOUR CURATION / XIII</span><h1>Để dành cho lần tới.</h1><p>{items.length} món yêu thích · Lưu trên trình duyệt này. Giá và tồn kho được cập nhật khi mở sản phẩm.</p></div>
    {!ready?<p role="status">Đang tải danh sách…</p>:items.length?<div className="search-product-grid">{items.map(product=><ProductCard key={product._id} product={product}/>)}</div>:<div className="search-empty"><strong>Gu của bạn bắt đầu từ một trái tim.</strong><p>Nhấn ♡ trên sản phẩm để lưu những món bạn thích.</p><Link href="/search">Khám phá sản phẩm →</Link></div>}
  </main></>;
}
