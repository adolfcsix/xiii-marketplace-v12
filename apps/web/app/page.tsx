import Link from 'next/link';
import { isLegacyCampaign } from '../lib/visual-assets';
import { Suspense } from 'react';
import { loadHome, type HomeData } from '../lib/home-data';
import { safeNextPath } from '../lib/navigation';
import { SiteHeader } from '../components/site-header';
import { StreetHero, StreetMarquee } from '../components/street-hero';
import { HomeCollection, CollectionSkeleton } from '../components/home-collection';
import { ArrowRight } from '../components/icons';
import { StreetOrb } from '../components/street-orb';
export const dynamic='force-dynamic';
async function ResolvedHero({data}:{data:Promise<HomeData>}){return <StreetHero banner={(await data).cms?.banners?.hero?.[0]}/>;}
async function Catalog({data}:{data:Promise<HomeData>}){
 const home=await data;
 return <>
  {home.categories.length>0&&<nav className="street-categories" aria-label="Danh mục sản phẩm"><Link href="/search">Tất cả <span>↗</span></Link>{home.categories.slice(0,7).map(category=><Link key={category._id} href={'/search?category='+encodeURIComponent(category.slug)}>{category.name}<span>↗</span></Link>)}</nav>}
  {home.sections.map((section,index)=>{const query=String(section.config?.query||'').trim();const collection=query?home.collections[query]:{products:home.products,error:home.catalogError};return <HomeCollection key={section._id} initialProducts={collection?.products||[]} initialError={collection?.error??true} allProducts={home.products} allError={home.catalogError} query={query} title={section.title} subtitle={section.subtitle} limit={Number(section.config?.productLimit||8)} first={index===0}/>;})}
 </>;
}
const stories=[
 {label:'01 / EVERYDAY UNIFORM',title:'BASIC.\nKHÔNG NHẠT.',image:'/street/tee-black.webp',href:'/search?q=tee',cta:'Tìm áo thun'},
 {label:'02 / AFTER HOURS',title:'FORM RỘNG.\nCHẤT RIÊNG.',image:'/street/hoodie-gray.webp',href:'/search?q=hoodie',cta:'Khám phá hoodie'},
 {label:'03 / THE FINISHING TOUCH',title:'ĐIỂM NHẤN.\nĐÚNG CHẤT.',image:'/street/chain.webp',href:'/search?category=phu-kien',cta:'Chọn phụ kiện'},
];
async function Stories({data}:{data:Promise<HomeData>}){
 const {cms}=await data;const custom=(cms?.banners?.promo||[]).filter(banner=>!isLegacyCampaign(banner.image));
 const cards=custom.length?custom.slice(0,3).map((banner,index)=>({label:banner.eyebrow||`0${index+1} / XIII EDIT`,title:banner.title,image:banner.image,href:safeNextPath(banner.href,'/search'),cta:banner.ctaLabel})):stories;
 return <section className="street-stories"><div className="street-section-heading" data-reveal><div><span className="street-eyebrow">02 / FIND YOUR AESTHETIC</span><h2>GU NÀO CŨNG CÓ CHẤT.</h2></div><p>Không có công thức. Chỉ có cách bạn phối.</p></div><div className="street-story-grid">{cards.map((card,index)=><Link href={card.href} key={card.href+index} className="promo-tile street-story" data-depth="story" data-reveal data-delay={index*90}><div className="story-image"><img src={card.image} alt="" loading="lazy" decoding="async" width={600} height={600}/><span className="story-number" aria-hidden="true">0{index+1}</span></div><div className="story-copy"><small>{card.label}</small><strong>{card.title.split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</strong><i>{card.cta}<ArrowRight size={19}/></i></div></Link>)}</div></section>;
}
async function ExtraCampaigns({data}:{data:Promise<HomeData>}){
 const {cms}=await data;const banners=(cms?.banners?.editorial||[]).filter(banner=>!isLegacyCampaign(banner.image));
 return banners.length?<section className="street-extra">{banners.map(banner=><Link href={safeNextPath(banner.href,'/search')} key={banner._id} data-reveal><img src={banner.image} alt="" loading="lazy"/><div><small>{banner.eyebrow}</small><h2>{banner.title}</h2><span>{banner.ctaLabel} ↗</span></div></Link>)}</section>:null;
}
export default function Home(){
 const data=loadHome();
 return <><SiteHeader/><main className="street-home"><Suspense fallback={<StreetHero pending/>}><ResolvedHero data={data}/></Suspense><StreetMarquee/><Suspense fallback={<CollectionSkeleton/>}><Catalog data={data}/></Suspense><Suspense fallback={null}><Stories data={data}/></Suspense>
  <StreetOrb/>
  <section className="street-manifesto" data-reveal><div className="manifesto-photo"><img src="/street/hero.webp" alt="Phong cách streetwear đen trắng tự do" loading="lazy" width={1536} height={1024}/><span className="tape-label">THIS IS YOUR / EVERYDAY REBELLION</span></div><div className="manifesto-copy"><span className="street-eyebrow">03 / MORE THAN WHAT YOU WEAR</span><h2>KHÔNG CẦN<br/>GIỐNG AI.<br/><em>GIỐNG BẠN.</em></h2><p>Một chiếc áo rộng. Một đôi giày quen. Một chi tiết chẳng theo quy tắc. Gu riêng bắt đầu từ những điều nhỏ như thế.</p><Link href="/search?sort=newest" className="street-button light">Tìm món đồ của bạn <ArrowRight size={19}/></Link><span className="manifesto-sign" aria-hidden="true">XIII / YOUR OWN WAY.</span></div></section>
  <Suspense fallback={null}><ExtraCampaigns data={data}/></Suspense><section className="street-service-row" aria-label="Mua sắm cùng XIII"><Link href="/help"><b>01</b><div><strong>Mua sắm dễ dàng</strong><span>Tìm hiểu cách đặt hàng và giao nhận</span></div><ArrowRight size={20}/></Link><Link href="/wishlist"><b>02</b><div><strong>Lưu lại gu của bạn</strong><span>Những món đồ bạn muốn quay lại</span></div><ArrowRight size={20}/></Link><Link href="/seller-apply"><b>03</b><div><strong>Mang chất riêng lên XIII</strong><span>Mở gian hàng dành cho brand của bạn</span></div><ArrowRight size={20}/></Link></section>
 </main><footer className="street-footer"><div className="footer-top"><p>ĐƯỜNG PHỐ LÀ CỦA BẠN.<br/><strong>PHONG CÁCH CŨNG VẬY.</strong></p><div><Link href="/search">Khám phá ↗</Link><Link href="/help">Trợ giúp ↗</Link><Link href="/account/orders">Đơn mua ↗</Link></div></div><div className="footer-wordmark" aria-hidden="true">XIII<span>®</span></div><div className="footer-bottom"><span>XIII / INDEPENDENT SPIRIT</span><span>LOCAL BRANDS · VIETNAM</span><a href="#top">Lên đầu trang ↑</a></div></footer></>;
}
