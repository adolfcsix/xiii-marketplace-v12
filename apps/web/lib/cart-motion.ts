/** Dispatch only after a confirmed cart write. Animation must never affect checkout. */
export function celebrateCart(image:HTMLImageElement|null, fallback?:Element|null){
 if(!image?.isConnected)return;
 let box=image.getBoundingClientRect();
 if(fallback&&(box.bottom<=0||box.top>=innerHeight||box.right<=0||box.left>=innerWidth)){
  const origin=fallback.getBoundingClientRect();const size=Math.min(64,origin.height,origin.width);
  box=new DOMRect(origin.x+(origin.width-size)/2,origin.y+(origin.height-size)/2,size,size);
 }
 if(!box.width||!box.height)return;
 window.dispatchEvent(new CustomEvent('xiii-cart-flight',{detail:{src:image.currentSrc||image.src,x:box.x,y:box.y,width:box.width,height:box.height}}));
}
