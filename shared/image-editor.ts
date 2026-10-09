export type ImageEdit={rotation:0|90|180|270;ratio:number;zoom:number;x:number;y:number};
export const ORIGINAL_EDIT:ImageEdit={rotation:0,ratio:0,zoom:1,x:0,y:0};
export function cropGeometry(width:number,height:number,edit:ImageEdit){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Kích thước ảnh không hợp lệ.');
 const rotated=edit.rotation===90||edit.rotation===270;
 const w=rotated?height:width,h=rotated?width:height;
 const ratio=edit.ratio>0?edit.ratio:w/h;
 let cw=w,ch=h;if(w/h>ratio)cw=h*ratio;else ch=w/ratio;
 const zoom=Math.max(1,Math.min(3,edit.zoom||1));cw/=zoom;ch/=zoom;
 return {width:cw,height:ch,x:(w-cw)*(Math.max(-100,Math.min(100,edit.x))+100)/200,y:(h-ch)*(Math.max(-100,Math.min(100,edit.y))+100)/200,rotatedWidth:w,rotatedHeight:h};
}
export function drawImageEdit(canvas:HTMLCanvasElement,img:HTMLImageElement,edit:ImageEdit,preview=false){
 const c=cropGeometry(img.naturalWidth,img.naturalHeight,edit);
 if(!preview&&c.width*c.height>32_000_000)throw new Error('Ảnh quá lớn để chỉnh trên trình duyệt. Hãy tải nguyên ảnh hoặc giảm kích thước trước.');
 const scale=preview?Math.min(1,600/c.width,420/c.height):1;
 canvas.width=Math.max(1,Math.round(c.width*scale));canvas.height=Math.max(1,Math.round(c.height*scale));
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Trình duyệt chưa hỗ trợ chỉnh ảnh.');
 ctx.scale(canvas.width/c.width,canvas.height/c.height);ctx.translate(-c.x,-c.y);ctx.translate(c.rotatedWidth/2,c.rotatedHeight/2);ctx.rotate(edit.rotation*Math.PI/180);ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
}
export function loadImage(file:File){return new Promise<HTMLImageElement>((resolve,reject)=>{
 const url=URL.createObjectURL(file),img=new Image();const finish=()=>{clearTimeout(timer);URL.revokeObjectURL(url);img.onload=null;img.onerror=null;};
 const timer=setTimeout(()=>{finish();reject(new Error('Không đọc được ảnh để chỉnh.'));},10000);
 img.onload=()=>{finish();resolve(img)};img.onerror=()=>{finish();reject(new Error('Không đọc được ảnh để chỉnh.'))};img.src=url;
});}
export async function exportImageEdit(file:File,edit:ImageEdit){
 if(JSON.stringify(edit)===JSON.stringify(ORIGINAL_EDIT))return file;
 if(file.type==='image/gif')throw new Error('GIF được tải nguyên để giữ chuyển động.');
 const img=await loadImage(file),canvas=document.createElement('canvas');drawImageEdit(canvas,img,edit);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không xuất được ảnh.')),'image/png'));
 return new File([blob],file.name.replace(/\.[^.]*$/,'')+'-edited.png',{type:'image/png',lastModified:Date.now()});
}
