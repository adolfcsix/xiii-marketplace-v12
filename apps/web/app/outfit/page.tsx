import { SiteHeader } from '../../components/site-header';
import { OutfitBuilder } from '../../components/outfit-builder';
import { apiPage } from '../../lib/api';
import { toHomeCard, type CatalogProduct } from '../../lib/home-data';
import type { ProductCardData } from '../../components/product-card';
export const dynamic='force-dynamic';
export default async function OutfitPage({searchParams}:{searchParams:Promise<{product?:string|string[]}>}) {
 const params=await searchParams;const seed=typeof params.product==='string'?params.product:'';
 let products:ProductCardData[]=[];let error=false;let pages=1;
 try{const result=await apiPage<CatalogProduct[]>('/products?limit=24');if(!Array.isArray(result.data))throw new Error('Catalog unavailable');products=result.data.map(toHomeCard);pages=Number(result.meta?.totalPages)||1;}catch{error=true;}
 return <><SiteHeader/><main className="outfit-shell"><header><span className="street-eyebrow">XIII / YOUR OWN LOOK</span><h1>PHỐI THEO GU BẠN.</h1><p>Phòng phối đồ tương tác của bạn. Kéo hoặc vuốt ma-nơ-canh để xoay, thử từng món đang bán và lưu phong cách riêng.</p></header><OutfitBuilder initialProducts={products} initialError={error} seed={seed} initialPages={pages}/></main></>;
}
