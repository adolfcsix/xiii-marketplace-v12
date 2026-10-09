import { api } from './api';
import type { DetailProduct, DetailVariant } from '../components/product-detail-client';
export type OutfitSelection = { product:DetailProduct; variant:DetailVariant };
export async function loadPreview(slug:string, signal:AbortSignal) {
 const request=new AbortController();const cancel=()=>request.abort();
 if(signal.aborted)cancel();else signal.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(cancel,15000);
 try {
  const product=await api<DetailProduct>('/products/'+encodeURIComponent(slug),{signal:request.signal});
  if (!product || typeof product._id!=='string' || typeof product.name!=='string' || typeof product.slug!=='string') throw new Error('Không tải được sản phẩm.');
  const variants=await api<DetailVariant[]>('/products/'+encodeURIComponent(product._id)+'/variants',{signal:request.signal});
  if (!Array.isArray(variants)) throw new Error('Không tải được lựa chọn sản phẩm.');
  return {product,variants:variants.filter(v=>v&&typeof v._id==='string'&&Number.isFinite(v.price)&&v.price>=0)};
 } catch(error) {
  if(request.signal.aborted&&!signal.aborted)throw new Error('Kết nối quá chậm. Vui lòng thử lại.');
  throw error;
 } finally { clearTimeout(timeout);signal.removeEventListener('abort',cancel); }
}
