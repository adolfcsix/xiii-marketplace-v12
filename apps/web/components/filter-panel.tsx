'use client';
import { useEffect, useState } from 'react';
export function FilterPanel({children}:{children:React.ReactNode}){
  const [open,setOpen]=useState(true);
  useEffect(()=>{const media=window.matchMedia('(min-width:751px)');const sync=()=>setOpen(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  return <details className="filter-disclosure" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary className="filter-mobile-toggle">Bộ lọc sản phẩm <span>⌄</span></summary>{children}</details>;
}
