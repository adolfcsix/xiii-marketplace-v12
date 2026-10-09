/** Demo illustrations upgrade without rewriting existing product records. */
const images=['tee-black','hoodie-gray','cargo-black','sneaker','cap','bag','chain','sweatshirt'];
export default {experimental:{cpus:2},async redirects(){return images.map(name=>({source:'/products/'+name+'.svg',destination:'/street/'+name+'.webp',permanent:false}));}};
