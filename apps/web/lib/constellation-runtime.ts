/** Focus the pinned ThreeUI source and make its motion independent of display FPS. */
export function adaptConstellationSource(html:string,dpr:number){
 const anchors=['function animateCanvas() {','node.x += node.vx;','node.y += node.vy;'];
 if(anchors.some(a=>!html.includes(a)))throw new Error('ThreeUI constellation timing anchors changed');
 return html.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<img\b[^>]*>/gi,'')
 .replace('Math.min(window.devicePixelRatio || 1, 2)','Math.min(window.devicePixelRatio || 1, '+dpr+')')
 .replace('function animateCanvas() {','let xiiiLastFrame=0;function animateCanvas() {const xiiiNow=performance.now();const xiiiStep=xiiiLastFrame?Math.min(3,(xiiiNow-xiiiLastFrame)/(1000/60)):1;xiiiLastFrame=xiiiNow;')
 .replace('node.x += node.vx;','node.x += node.vx*xiiiStep;').replace('node.y += node.vy;','node.y += node.vy*xiiiStep;')
 .replace('(node.x - pointer.x) * 0.005','(node.x - pointer.x) * (1-Math.pow(0.995,xiiiStep))')
 .replace('(node.y - pointer.y) * 0.005','(node.y - pointer.y) * (1-Math.pow(0.995,xiiiStep))');
}
