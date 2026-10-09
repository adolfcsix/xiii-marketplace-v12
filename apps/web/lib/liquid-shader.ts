// Original XIII renderer: smooth-union droplets and a monochrome studio environment.
// Art direction inspired by the interactive material studies in MengTo/threeui.
export const LIQUID_VERTEX = `attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
export const LIQUID_FRAGMENT = `
precision highp float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
float blend(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float field(vec3 p){
  float t=time*.48;
  vec3 q=p; q.xy-=pointer*.15;
  float a=length(q-vec3(-.18,sin(t)*.12,0.))-.72;
  float b=length(q-vec3(.54*cos(t*.65),.78+sin(t)*.15,.14*sin(t)))-.43;
  float c=length(q-vec3(.72+sin(t*.8)*.2,-.55,.1))-.33;
  float d=length(q-vec3(-.78,-.66+cos(t)*.12,.22))-.25;
  return blend(blend(blend(a,b,.42),c,.3),d,.27);
}
vec3 normalAt(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx)));}
vec3 studio(vec3 r){
  float strip=pow(max(0.,1.-abs(r.x*.7+r.y*.5+.1)),18.);
  float window=pow(max(0.,dot(r,normalize(vec3(-.6,.7,1.)))),28.);
  float rim=pow(max(0.,dot(r,normalize(vec3(.8,-.15,.4)))),12.);
  return vec3(.035,.043,.05)+vec3(.68,.72,.75)*strip+vec3(1.)*window+vec3(.34,.39,.44)*rim;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y);
  vec3 ro=vec3(0.,0.,3.8);vec3 rd=normalize(vec3(uv*2.65,-3.8));
  float travel=0.;float dist=0.;vec3 p;
  for(int i=0;i<56;i++){p=ro+rd*travel;dist=field(p);if(dist<.002||travel>6.)break;travel+=dist*.85;}
  if(travel>6.||dist>.012){gl_FragColor=vec4(0.);return;}
  vec3 n=normalAt(p);vec3 reflection=reflect(rd,n);
  float fresnel=pow(1.-max(dot(n,-rd),0.),3.);
  vec3 col=studio(reflection)*(.7+fresnel*.7);
  col+=vec3(.20,.23,.25)*pow(max(dot(n,normalize(vec3(-.6,1.,2.))),0.),3.);
  col+=vec3(.5)*pow(max(dot(reflect(normalize(vec3(.5,-1.,-2.)),n),-rd),0.),55.);
  col=mix(col,vec3(.8,.87,.9),fresnel*.2);
  gl_FragColor=vec4(pow(col,vec3(.82)),1.);
}`;
