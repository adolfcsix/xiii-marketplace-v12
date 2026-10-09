import { sellerApi } from './client-api';
import { prepareImage, uploadPreparedImage, type PresignedImage } from '../../../shared/image-upload';
export { IMAGE_ACCEPT, IMAGE_FORMATS } from '../../../shared/image-upload';
type Purpose='PRODUCT_IMAGE'|'SHOP_LOGO'|'SHOP_BANNER';
export async function uploadSellerImage(file:File,purpose:Purpose){
 const prepared=await prepareImage(file,purpose);
 const signed=await sellerApi<PresignedImage>('/uploads/presign',{method:'POST',body:JSON.stringify({purpose,fileName:prepared.name,contentType:prepared.type,sizeBytes:prepared.size})});
 return uploadPreparedImage(prepared,signed);
}
