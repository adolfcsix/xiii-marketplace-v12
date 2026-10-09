import {clientApi} from './client-api';
import {prepareImage,uploadPreparedImage,type PresignedImage} from '../../../shared/image-upload';
export async function uploadBuyerImage(file:File,purpose:'REVIEW_IMAGE'|'RETURN_IMAGE'){
 const prepared=await prepareImage(file,purpose);
 const signed=await clientApi<PresignedImage>('/uploads/presign',{method:'POST',body:JSON.stringify({purpose,fileName:prepared.name,contentType:prepared.type,sizeBytes:prepared.size})});
 return uploadPreparedImage(prepared,signed);
}
