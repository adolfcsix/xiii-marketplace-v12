import { adminApi } from './client-api';
import { prepareImage, uploadPreparedImage, type PresignedImage } from '../../../shared/image-upload';
export { IMAGE_ACCEPT, IMAGE_FORMATS } from '../../../shared/image-upload';
type Purpose='CMS_BANNER'|'CATEGORY_IMAGE'|'BRAND_LOGO';
export async function uploadAdminImage(file:File,purpose:Purpose){
 const prepared=await prepareImage(file,purpose);
 const signed=await adminApi<PresignedImage>('/uploads/presign',{method:'POST',body:JSON.stringify({purpose,fileName:prepared.name,contentType:prepared.type,sizeBytes:prepared.size})});
 return uploadPreparedImage(prepared,signed);
}
