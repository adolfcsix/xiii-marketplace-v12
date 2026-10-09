export const IMAGE_ACCEPT='image/jpeg,image/png,image/webp,image/gif,image/avif,.jpg,.jpeg,.jfif,.png,.webp,.gif,.avif';
export const IMAGE_FORMATS='JPG/JPEG, PNG, WebP, GIF, AVIF';
export const IMAGE_LIMITS={PRODUCT_IMAGE:10,SHOP_LOGO:5,SHOP_BANNER:10,AVATAR:5,REVIEW_IMAGE:10,RETURN_IMAGE:10,CMS_BANNER:12,CATEGORY_IMAGE:8,BRAND_LOGO:5} as const;
export type ImagePurpose=keyof typeof IMAGE_LIMITS;
export type ImageMime='image/jpeg'|'image/png'|'image/webp'|'image/gif'|'image/avif';
const extension:Record<ImageMime,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif'};
export function sniffImage(bytes:Uint8Array):ImageMime|null {
 const text=(start:number,length:number)=>String.fromCharCode(...bytes.slice(start,start+length));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(text(0,4)==='RIFF'&&text(8,4)==='WEBP')return 'image/webp';
 if(['GIF87a','GIF89a'].includes(text(0,6)))return 'image/gif';
 if(text(4,4)==='ftyp'){
  const length=((bytes[0]*2**24)+(bytes[1]*2**16)+(bytes[2]*256)+bytes[3]);
  if(length>=16){const end=Math.min(length,bytes.length);for(let i=8;i+4<=end;i+=4){if(i===12)continue;if(['avif','avis'].includes(text(i,4)))return 'image/avif';}}
 }
 return null;
}
export function canonicalImageName(name:string,mime:ImageMime){
 const base=name.replace(/\\/g,'/').split('/').pop()||'image';
 const stem=base.replace(/\.[^.]*$/,'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,150)||'image';
 return stem+'.'+extension[mime];
}
export function checkImageSize(size:number,purpose:ImagePurpose){
 if(!Number.isSafeInteger(size)||size<=0)throw new Error('File ảnh rỗng hoặc không hợp lệ.');
 if(size>IMAGE_LIMITS[purpose]*1024*1024)throw new Error('Ảnh vượt quá '+IMAGE_LIMITS[purpose]+' MB cho mục này.');
}
async function ensureDecodable(file:File){
 const url=URL.createObjectURL(file);const img=new Image();
 try{await new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>{img.onload=null;img.onerror=null;img.src='';reject(new Error('Không đọc được ảnh trong thời gian cho phép.'));},10000);
  img.onload=()=>{clearTimeout(timer);img.naturalWidth&&img.naturalHeight?resolve():reject(new Error('Ảnh không có kích thước hợp lệ.'));};
  img.onerror=()=>{clearTimeout(timer);reject(new Error('Ảnh bị hỏng hoặc trình duyệt chưa hỗ trợ định dạng này. Hãy xuất lại thành JPG hoặc PNG.'));};
  img.src=url;
 });}finally{img.onload=null;img.onerror=null;URL.revokeObjectURL(url);}
}
export async function prepareImage(file:File,purpose:ImagePurpose){
 checkImageSize(file.size,purpose);
 const mime=sniffImage(new Uint8Array(await file.slice(0,256).arrayBuffer()));
 if(!mime)throw new Error('Định dạng ảnh chưa hỗ trợ. Chọn '+IMAGE_FORMATS+'. Với HEIC/HEIF, hãy xuất sang JPG hoặc PNG.');
 const normalized=new File([file],canonicalImageName(file.name,mime),{type:mime,lastModified:file.lastModified});
 await ensureDecodable(normalized);return normalized;
}
export type PresignedImage={uploadUrl:string;fields:Record<string,string>;publicUrl:string;method:'POST'};
export async function uploadPreparedImage(file:File,signed:PresignedImage){
 if(signed?.method!=='POST'||!signed.uploadUrl||!signed.publicUrl||!signed.fields)throw new Error('Thông tin tải ảnh chưa hợp lệ. Vui lòng thử lại.');
 const form=new FormData();Object.entries(signed.fields).forEach(([k,v])=>form.append(k,v));form.append('file',file);
 let response:Response;
 try{response=await fetch(signed.uploadUrl,{method:'POST',body:form,signal:AbortSignal.timeout(60000)});}catch{throw new Error('Không tải được ảnh. Kiểm tra kết nối rồi thử lại.');}
 if(!response.ok)throw new Error(response.status===403?'Liên kết tải ảnh hết hạn hoặc không được chấp nhận. Hãy chọn lại ảnh.':'Máy chủ lưu ảnh chưa nhận được file (HTTP '+response.status+'). Vui lòng thử lại.');
 return signed.publicUrl;
}
