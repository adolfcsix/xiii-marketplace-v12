import Link from 'next/link';
import {ActiveFilters} from '../../components/active-filters';
import { FilterPanel } from '../../components/filter-panel';
import { optionalNumber } from '../../lib/search-params';
import { api, apiPage } from '../../lib/api';
import { ProductCard, type ProductCardData } from '../../components/product-card';
import { SiteHeader } from '../../components/site-header';
import { ArrowRight, ChevronRight, SearchIcon, StarIcon } from '../../components/icons';

type SearchParams = Record<string, string | string[] | undefined>;
type Category = { _id:string; name:string; slug:string; level:number };
type Brand = { _id:string; name:string; slug:string; logo?:string; verified?:boolean };
type SearchProduct = {
  _id:string; name:string; slug:string; shortDescription?:string; images?:string[];
  ratingAverage?:number; ratingCount?:number; soldCount?:number;
  primaryVariant?:{ price?:number; compareAtPrice?:number; image?:string; attributes?:Record<string,string> };
  brand?:{ name?:string; slug?:string };
  shop?:{_id:string;name?:string;slug?:string};
};

const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';
const num=optionalNumber;

function href(params:SearchParams, patch:Record<string,string|number|undefined|null>){
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(params)){
    const value=one(v); if(value) q.set(k,value);
  }
  for(const [k,v] of Object.entries(patch)){
    if(v===undefined||v===null||v==='') q.delete(k); else q.set(k,String(v));
  }
  if(!('page' in patch)) q.delete('page');
  const s=q.toString(); return '/search'+(s?'?'+s:'');
}

const sortLabels:Record<string,string>={popular:'Phổ biến nhất',newest:'Mới nhất',rating:'Đánh giá cao',price_asc:'Giá thấp → cao',price_desc:'Giá cao → thấp'};

export default async function SearchPage({searchParams}:{searchParams:Promise<SearchParams>}){
  const params=await searchParams;
  const q=one(params.q);
  const category=one(params.category);
  const brand=one(params.brand);
  const shop=one(params.shop);
  const color=one(params.color);
  const size=one(params.size);
  const requestedSort=one(params.sort);
  const sort=Object.keys(sortLabels).includes(requestedSort)?requestedSort:'popular';
  const rating=num(params.rating);
  const priceMin=num(params.priceMin);
  const priceMax=num(params.priceMax);
  const page=Math.max(1,Math.floor(num(params.page)||1));

  const apiQs=new URLSearchParams();
  if(q) apiQs.set('q',q); if(category) apiQs.set('category',category); if(brand) apiQs.set('brand',brand); if(shop) apiQs.set('shop',shop);
  if(color) apiQs.set('color',color); if(size) apiQs.set('size',size); if(priceMin!==undefined) apiQs.set('priceMin',String(priceMin));
  if(priceMax!==undefined) apiQs.set('priceMax',String(priceMax)); if(rating!==undefined) apiQs.set('rating',String(rating));
  apiQs.set('sort',sort); apiQs.set('page',String(page)); apiQs.set('limit','12');

  let loadError=false;
  let products:SearchProduct[]=[]; let total=0; let totalPages=0; let categories:Category[]=[]; let brands:Brand[]=[];
  try{
    const [productPage,categoryData,brandData]=await Promise.allSettled([
      apiPage<SearchProduct[]>('/products?'+apiQs.toString()), api<Category[]>('/categories'), api<Brand[]>('/brands')
    ]);
    if(productPage.status==='rejected')throw productPage.reason;
    products=productPage.value.data;total=Number(productPage.value.meta?.total||0);totalPages=Number(productPage.value.meta?.totalPages||0);
    if(categoryData.status==='fulfilled')categories=categoryData.value.filter(c=>c.level>=2);
    if(brandData.status==='fulfilled')brands=brandData.value;
  }catch{loadError=true;}

  const cards:ProductCardData[]=products.map(p=>({
    _id:p._id,name:p.name,slug:p.slug,image:p.images?.[0]||p.primaryVariant?.image||'/products/fallback.svg',
    price:p.primaryVariant?.price,compareAtPrice:p.primaryVariant?.compareAtPrice,ratingAverage:p.ratingAverage,
    ratingCount:p.ratingCount,soldCount:p.soldCount,brand:p.brand?.name||'XIII Official'
  }));

  const shopLabel=products[0]?.shop?.name||'Gian hàng';
  const title=q?`Kết quả tìm kiếm: “${q}”`:category?`Danh mục: ${categories.find(c=>c.slug===category)?.name||category}`:shop?shopLabel:'Tất cả sản phẩm';
  const activeFilters:Array<{label:string;patch:Record<string,null>}>=[];
  if(q)activeFilters.push({label:'Từ khóa: '+q,patch:{q:null}});
  if(category)activeFilters.push({label:categories.find(c=>c.slug===category)?.name||category,patch:{category:null}});
  if(shop)activeFilters.push({label:'Gian hàng: '+shopLabel,patch:{shop:null}});
  if(brand)activeFilters.push({label:brands.find(b=>b.slug===brand)?.name||brand,patch:{brand:null}});
  if(color)activeFilters.push({label:'Màu: '+color,patch:{color:null}});
  if(size)activeFilters.push({label:'Size: '+size,patch:{size:null}});
  if(rating!==undefined)activeFilters.push({label:'Từ '+rating+' sao',patch:{rating:null}});
  if(priceMin!==undefined||priceMax!==undefined)activeFilters.push({label:'Giá: '+new Intl.NumberFormat('vi-VN').format(priceMin??0)+' – '+(priceMax===undefined?'không giới hạn':new Intl.NumberFormat('vi-VN').format(priceMax))+'đ',patch:{priceMin:null,priceMax:null}});
  const colors=[['Black','#111'],['White','#fff'],['Gray','#aaa'],['Beige','#ded5c5'],['Navy','#1d3155'],['Green','#48644e'],['Red','#e7352c']];

  return <>
    <SiteHeader/>
    <main className="search-shell">
      <div className="search-breadcrumb"><Link prefetch={false} href="/">Trang chủ</Link><ChevronRight size={13}/><span>Tìm kiếm</span></div>
      <div className="search-title-row">
        <div><span className="street-eyebrow">FIND YOUR OWN WAY / XIII</span><h1>{title}</h1><p>Tìm thấy <b>{new Intl.NumberFormat('vi-VN').format(total)}</b> sản phẩm</p></div>
      </div>

      <div className="search-layout">
        <FilterPanel><aside className="filter-sidebar">
          <section className="filter-block"><div className="filter-heading">Danh mục <span>⌃</span></div>
            <Link prefetch={false} className={!category?'filter-check active':''} href={href(params,{category:null})}><span className="check-box">✓</span>Tất cả sản phẩm</Link>
            {categories.slice(0,8).map(c=><Link prefetch={false} key={c._id} className={'filter-check '+(category===c.slug?'active':'')} href={href(params,{category:c.slug})}><span className="check-box">{category===c.slug?'✓':''}</span>{c.name}</Link>)}
          </section>

          <section className="filter-block"><div className="filter-heading">Thương hiệu <span>⌃</span></div>
            
            {brands.slice(0,7).map(b=><Link prefetch={false} key={b._id} className={'filter-check '+(brand===b.slug?'active':'')} href={href(params,{brand:brand===b.slug?null:b.slug})}><span className="check-box">{brand===b.slug?'✓':''}</span>{b.name}</Link>)}
          </section>

          <section className="filter-block"><div className="filter-heading">Mức giá <span>⌃</span></div>
            <div className="price-inputs"><span>{priceMin?new Intl.NumberFormat('vi-VN').format(priceMin)+'đ':'Từ 0đ'}</span><i>Đến</i><span>{priceMax?new Intl.NumberFormat('vi-VN').format(priceMax)+'đ':'1.000.000đ'}</span></div>
            <div className="price-presets">
              <Link prefetch={false} className={priceMax===200000?'active':''} href={href(params,{priceMin:null,priceMax:200000})}>Dưới 200K</Link>
              <Link prefetch={false} className={priceMin===200000&&priceMax===400000?'active':''} href={href(params,{priceMin:200000,priceMax:400000})}>200K - 400K</Link>
              <Link prefetch={false} className={priceMin===400000&&priceMax===600000?'active':''} href={href(params,{priceMin:400000,priceMax:600000})}>400K - 600K</Link>
              <Link prefetch={false} className={priceMin===600000?'active':''} href={href(params,{priceMin:600000,priceMax:null})}>Trên 600K</Link>
            </div>
          </section>

          <section className="filter-block"><div className="filter-heading">Màu sắc <span>⌃</span></div>
            <div className="color-filter">{colors.map(([name,hex])=><Link prefetch={false} key={name} aria-label={name} title={name} className={color===name?'active':''} href={href(params,{color:color===name?null:name})} style={{background:hex}}/>)}</div>
          </section>

          <section className="filter-block"><div className="filter-heading">Kích thước <span>⌃</span></div>
            <div className="size-filter">{['S','M','L','XL','Free'].map(v=><Link prefetch={false} key={v} className={size===v?'active':''} href={href(params,{size:size===v?null:v})}>{v}</Link>)}</div>
          </section>

          <section className="filter-block"><div className="filter-heading">Đánh giá <span>⌃</span></div>
            {[4.5,4,3].map(v=><Link prefetch={false} key={v} className={'rating-filter '+(rating===v?'active':'')} href={href(params,{rating:rating===v?null:v})}><span>{'★'.repeat(Math.floor(v))}{v%1?'☆':''}</span>Từ {v.toFixed(1)} trở lên</Link>)}
          </section>

          <Link prefetch={false} className="clear-filters" href={q?'/search?q='+encodeURIComponent(q):'/search'}>Xóa bộ lọc</Link>
        </aside></FilterPanel>

        <section className="search-results">
          <div className="result-toolbar">
            <div className="result-tabs">
              <Link prefetch={false} className={!brand?'active':''} href={href(params,{brand:null})}>Tất cả <b>({total})</b></Link>
              {brands.slice(0,3).map(b=><Link prefetch={false} key={b._id} className={brand===b.slug?'active':''} href={href(params,{brand:b.slug})}>{b.name}</Link>)}
            </div>
            <details className="sort-menu"><summary>Sắp xếp: <b>{sortLabels[sort]||sortLabels.popular}</b>⌄</summary><div>{Object.entries(sortLabels).map(([key,label])=><Link prefetch={false} className={sort===key?'active':''} key={key} href={href(params,{sort:key,page:1})}>{label}</Link>)}</div></details>
          </div>

          {activeFilters.length>0?<ActiveFilters filters={activeFilters.map(filter=>({label:filter.label,href:href(params,filter.patch)}))}/>:<div className="keyword-row">{categories.slice(0,6).map(c=><Link prefetch={false} key={c._id} href={href(params,{category:c.slug,page:1})}>{c.name}<span aria-hidden="true"> ↗</span></Link>)}</div>}

          {loadError?<div className="search-empty" role="alert"><strong>Chưa tải được sản phẩm.</strong><span>Vui lòng kiểm tra kết nối và thử lại.</span><Link prefetch={false} href={href(params,{page})}>Thử lại</Link></div>:cards.length?<div className="search-product-grid">{cards.map(p=><ProductCard key={p._id} product={p}/>)}</div>:<div className="search-empty"><strong>Không tìm thấy sản phẩm phù hợp.</strong><span>Thử đổi từ khóa hoặc xóa bớt bộ lọc.</span><Link prefetch={false} href="/search">Xem tất cả sản phẩm</Link></div>}

          {totalPages>1&&<nav className="pagination" aria-label="Phân trang">
            <Link prefetch={false} className={page<=1?'disabled':''} href={page>1?href(params,{page:page-1}):'#'}>‹</Link>
            {Array.from({length:Math.min(totalPages,5)},(_,i)=>Math.max(1,Math.min(page-2,totalPages-4))+i).map(n=><Link prefetch={false} key={n} className={page===n?'active':''} aria-current={page===n?'page':undefined} href={href(params,{page:n})}>{n}</Link>)}
            {totalPages>5&&<span>…</span>}<Link prefetch={false} className={page>=totalPages?'disabled':''} href={page<totalPages?href(params,{page:page+1}):'#'}>›</Link>
          </nav>}
        </section>

        <aside className="search-right-rail">
          <Link prefetch={false} className="search-campaign" href="/search?q=hoodie"><img src="/street/hero.webp" alt="Hoodie collection"/><span><small>HOODIE COLLECTION</small><strong>FORM RỘNG.<br/>GU RIÊNG.</strong><i>Xem ngay <ArrowRight size={14}/></i></span></Link>
          <section className="rail-card"><div className="rail-title"><b>Thương hiệu nổi bật</b><Link prefetch={false} href="/search">Xem tất cả <ArrowRight size={13}/></Link></div><div className="brand-orbs">{(brands.length?brands.slice(0,8):[{_id:'x',name:'XIII',slug:'xiii'}]).map(b=><Link prefetch={false} href={href(params,{brand:b.slug})} key={b._id}><span>{b.name.slice(0,4).toUpperCase()}</span><small>{b.name}</small></Link>)}</div></section>
          <Link prefetch={false} className="hot-deal" href="/search?q=sale"><span><b>CHỌN DEAL ĐÚNG GU</b><small>Khám phá sản phẩm giảm giá</small><em>Khám phá ưu đãi</em></span><img src="/products/hoodie-gray.svg" alt="Hot deal"/></Link>
          <section className="rail-card recently"><div className="rail-title"><b>Gợi ý khám phá</b><Link prefetch={false} href="/search">Xem tất cả <ArrowRight size={13}/></Link></div><div className="recent-grid">{cards.slice(0,4).map(p=><Link prefetch={false} href={'/product/'+p.slug} key={p._id}><img src={p.image||'/products/fallback.svg'} alt=""/><strong>{p.name}</strong><span>{p.price?new Intl.NumberFormat('vi-VN').format(p.price)+'đ':'Liên hệ'}</span></Link>)}</div></section>
        </aside>
      </div>
    </main>
  </>;
}
