'use client';
import Link from 'next/link';
import { isLegacyCampaign } from '../lib/visual-assets';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight } from './icons';
import { MotionToggle, useStreetMotion } from './street-motion';
import type { HomeBanner } from '../lib/home-data';
import { safeNextPath } from '../lib/navigation';
const ThreeUIConstellation=dynamic(()=>import('./threeui-constellation').then(module=>module.ThreeUIConstellation),{ssr:false});
const LiquidSculpture=dynamic(()=>import('./liquid-sculpture').then(module=>module.LiquidSculpture),{ssr:false});
export function StreetHero({banner,pending=false}:{banner?:HomeBanner;pending?:boolean}){
 const {enabled}=useStreetMotion();
 const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
 const custom=Boolean(banner&&!isLegacyCampaign(banner.image));
 const title=custom?banner!.title:'XIII';
 return <section className={'street-hero'+(!custom?' liquid-hero':'')} aria-label="Bộ sưu tập XIII" data-depth="hero">
  <picture className="street-hero-media">{custom&&banner?.mobileImage&&<source media="(max-width:650px)" srcSet={banner.mobileImage}/>}<img src={custom?banner!.image:'/street/hero-xiii.jpg'} alt={custom?banner!.title:'Hai người mẫu streetwear XIII trong không gian skatepark bê tông đen trắng'} fetchPriority="high" width={1536} height={1024}/></picture>
  <div className="hero-spray" aria-hidden="true"/>
  {custom ? mounted&&enabled&&<ThreeUIConstellation/> : <><LiquidSculpture/><Link className="liquid-edit-card" href="/outfit"><img src="/street/tee-black.webp" alt="Áo thun XIII đen" width={104} height={112}/><span><small>THE XIII EDIT / 01</small><strong>GU RIÊNG.<br/>FORM TỰ DO.</strong><em>Thử phối đồ ↗</em></span></Link></>}
  <div className="street-hero-top"><span>XIII® / INDEPENDENT SPIRIT</span><span>LOCAL BRANDS. NO LIMITS.</span></div>
  <div className={'street-hero-copy'+(!custom?' street-hero-brand-copy':'')}><span className="street-eyebrow">{custom?banner?.eyebrow:'THE STREETS ARE YOURS'}</span><h1>{title.split('\n').map((line,index)=><span className="hero-line" key={index}><span style={{animationDelay:index*100+'ms'}}>{line}</span></span>)}</h1><p>{custom?banner?.subtitle:'Không cần giống ai. Chỉ cần đúng gu bạn.\nKhám phá streetwear và những local brand có chất riêng.'}</p><div className="hero-actions"><Link href={custom?safeNextPath(banner?.href||null,'/search'):'/search'} className="street-button light street-button-shimmer">{custom?banner?.ctaLabel:'Khám phá ngay'} <ArrowRight size={19}/></Link><a href="/outfit" className="hero-secondary">Phối gu của bạn <span>↘</span></a></div></div>
  <div className="hero-stamp" aria-hidden="true"><span>MADE FOR</span><strong>THE<br/>STREETS.</strong><small>EST. XIII / VIETNAM</small></div>
  <div className="street-hero-bottom"><a href="#collections" className="scroll-cue"><span aria-hidden="true">↓</span> CUỘN ĐỂ KHÁM PHÁ</a><MotionToggle pending={pending}/></div>
 </section>;
}
export function StreetMarquee(){return <div className="street-ticker" aria-label="Wear your own way. XIII street culture."><div className="ticker-track" aria-hidden="true">{[0,1,2,3].map(index=><span key={index}>WEAR YOUR OWN WAY <b>✳</b> KHÔNG THEO KHUÔN MẪU <b>✳</b> XIII STREET CULTURE <b>✳</b></span>)}</div></div>;}
