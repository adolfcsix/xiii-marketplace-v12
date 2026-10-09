import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError, api, apiPage } from '../../../lib/api';
import { SiteHeader } from '../../../components/site-header';
import { ChevronRight, StarIcon } from '../../../components/icons';
import { ProductCard, type ProductCardData } from '../../../components/product-card';
import { ProductDetailClient, type DetailProduct, type DetailVariant } from '../../../components/product-detail-client';

type PublicReview={media?:string[];_id:string;rating:number;comment:string;verifiedPurchase:boolean;sellerReply?:string;createdAt:string;buyer?:{displayName?:string;avatar?:string}};
type ReviewData={items:PublicReview[];summary:{average:number;count:number;distribution:Record<string,number>}};

type SearchProduct = {
  _id:string; name:string; slug:string; images?:string[]; ratingAverage?:number; ratingCount?:number; soldCount?:number;
  primaryVariant?:{price?:number;compareAtPrice?:number;image?:string}; brand?:{name?:string};
};

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  let product:DetailProduct; let variants:DetailVariant[]=[]; let related:SearchProduct[]=[]; let reviews:ReviewData={items:[],summary:{average:0,count:0,distribution:{}}};
  try{
    product=await api<DetailProduct>('/products/'+slug);
    const [variantData,relatedPage,reviewData]=await Promise.allSettled([
      api<DetailVariant[]>('/products/'+product._id+'/variants'),
      product.category?.slug?apiPage<SearchProduct[]>('/products?category='+encodeURIComponent(product.category.slug)+'&sort=popular&limit=6'):Promise.resolve({data:[] as SearchProduct[]}),
      api<ReviewData>('/reviews/product/'+product._id+'?limit=6')
    ]);
    if(variantData.status==='rejected')throw variantData.reason;
    variants=variantData.value;
    if(relatedPage.status==='fulfilled')related=relatedPage.value.data.filter(p=>p._id!==product._id).slice(0,5);
    if(reviewData.status==='fulfilled')reviews=reviewData.value;
  }catch(error){
    if(error instanceof ApiError&&error.status===404)notFound();
    return <><SiteHeader/><main className="product-detail-shell"><div className="detail-not-found"><b>Chưa tải được sản phẩm</b><span>Vui lòng kiểm tra kết nối và thử lại sau ít giây.</span><Link prefetch={false} href="/search">Quay lại cửa hàng</Link></div></main></>;
  }

  const cards:ProductCardData[]=related.map(p=>({
    _id:p._id,name:p.name,slug:p.slug,image:p.images?.[0]||p.primaryVariant?.image||'/products/fallback.svg',
    price:p.primaryVariant?.price,compareAtPrice:p.primaryVariant?.compareAtPrice,ratingAverage:p.ratingAverage,
    ratingCount:p.ratingCount,soldCount:p.soldCount,brand:p.brand?.name||product.brand?.name||'XIII Official'
  }));

  return <>
    <SiteHeader/>
    <main className="product-detail-shell">
      <nav className="detail-breadcrumb"><Link prefetch={false} href="/">Trang chủ</Link><ChevronRight size={13}/><Link prefetch={false} href="/search">Sản phẩm</Link>{product.category?.slug&&<><ChevronRight size={13}/><Link prefetch={false} href={'/search?category='+encodeURIComponent(product.category.slug)}>{product.category.name}</Link></>}<ChevronRight size={13}/><span>{product.name}</span></nav>
      <ProductDetailClient product={product} variants={variants}/>

      <section className="detail-info-section">
        <nav className="detail-tabs" aria-label="Thông tin sản phẩm"><Link href="#product-description">Mô tả sản phẩm</Link><Link href="#product-specs">Thông tin chi tiết</Link><Link href="#product-reviews">Đánh giá ({new Intl.NumberFormat('vi-VN').format(product.ratingCount||0)})</Link><Link href="/help">Trợ giúp</Link></nav>
        <div className="detail-info-grid">
          <article id="product-description"><h2>{product.name}</h2><p>{product.description || product.shortDescription}</p><div className="detail-specs" id="product-specs"><div><span>Thương hiệu</span><b>{product.brand?.name||'XIII Official'}</b></div><div><span>Danh mục</span><b>{product.category?.name||'Thời trang'}</b></div><div><span>Phong cách</span><b>{String(product.attributes?.style||'Streetwear')}</b></div><div><span>Form</span><b>{String(product.attributes?.fit||'Oversized')}</b></div><div><span>Đối tượng</span><b>{String(product.attributes?.gender||'Unisex')}</b></div><div><span>Chất liệu</span><b>{String(product.attributes?.material||'Streetwear')}</b></div></div></article>
          <aside className="detail-rating-card"><div className="detail-rating-score"><strong>{(product.ratingAverage||0).toFixed(1)}</strong><div><span>{Array.from({length:5},(_,i)=><StarIcon key={i} size={16}/>)}</span><small>{new Intl.NumberFormat('vi-VN').format(product.ratingCount||0)} đánh giá đã xác minh</small></div></div><div className="detail-rating-highlights"><span>✓ Verified Purchase</span><span>✓ Rating tính từ review đang hiển thị</span><span>✓ Shop có thể phản hồi công khai</span></div><Link prefetch={false} className="detail-review-own" href="/account/reviews">Đánh giá sản phẩm đã mua →</Link></aside>
        </div>
      </section>

      <section className="detail-public-reviews" id="product-reviews">
        <div className="section-heading"><div><span>VERIFIED PURCHASE</span><h2>Đánh giá từ người mua</h2></div><Link prefetch={false} href="/account/reviews">Viết đánh giá →</Link></div>
        {reviews.items.length?<div className="public-review-list">{reviews.items.map(r=>{const masked=r.buyer?.displayName||'Người mua XIII';return <article key={r._id}><header><div className="review-avatar">{masked.slice(0,1).toUpperCase()}</div><div><b>{masked}</b><span>{'★★★★★'.slice(0,r.rating)}{'☆☆☆☆☆'.slice(0,5-r.rating)}</span><small>✓ Đã mua hàng · {new Intl.DateTimeFormat('vi-VN').format(new Date(r.createdAt))}</small></div></header><p>{r.comment||'Người mua chỉ chấm điểm.'}</p>{r.media?.length?<div className="attached-images">{r.media.map((url,i)=><a key={url+i} href={url} target="_blank" rel="noreferrer"><img src={url} alt={'Ảnh đánh giá '+(i+1)}/></a>)}</div>:null}{r.sellerReply&&<blockquote><b>Phản hồi từ shop</b>{r.sellerReply}</blockquote>}</article>})}</div>:<div className="catalog-empty"><strong>Chưa có đánh giá chi tiết.</strong><span>Bạn có thể đánh giá sau khi đơn hàng hoàn tất.</span></div>}
      </section>

      <section className="detail-size-guide" id="size-guide"><h2>Chọn size phù hợp với bạn</h2><p>Đo vòng ngực, vòng eo và chiều dài món đồ bạn đang mặc vừa. Đối chiếu với thông tin kích thước của shop; mỗi thương hiệu có thể dùng một bảng size khác nhau.</p><p>Nếu chưa có số đo cụ thể, hãy dùng nút “Chat với shop” để hỏi trước khi đặt hàng.</p></section>
      <section className="detail-related">
        <div className="section-heading"><div><h2>Có thể bạn cũng thích</h2></div><Link prefetch={false} href={product.category?.slug?'/search?category='+encodeURIComponent(product.category.slug):'/search'}>Xem tất cả <ChevronRight size={15}/></Link></div>
        {cards.length?<div className="detail-related-grid">{cards.map(p=><ProductCard product={p} key={p._id}/>)}</div>:<div className="catalog-empty"><strong>Chưa có sản phẩm liên quan.</strong><span>Tiếp tục khám phá các danh mục khác trên XIII.</span></div>}
      </section>
    </main>
  </>;
}
