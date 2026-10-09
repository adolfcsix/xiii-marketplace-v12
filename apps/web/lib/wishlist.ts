'use client';
import { useEffect, useState } from 'react';
import type { ProductCardData } from '../components/product-card';
const KEY='xiii_wishlist_v1';
export function readWishlist():ProductCardData[]{
  try { const rows=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(rows)?rows.filter(p=>p && typeof p._id==='string' && typeof p.name==='string' && typeof p.slug==='string').slice(0,100):[];
  } catch { return []; }
}
export function toggleWishlist(product:ProductCardData){
  const list=readWishlist();const exists=list.some(p=>p._id===product._id);
  const next=exists?list.filter(p=>p._id!==product._id):[product,...list].slice(0,100);
  try { localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('xiii-wishlist-updated'));return true; }
  catch { return false; }
}
export function useWishlist(){
  const [items,setItems]=useState<ProductCardData[]>([]);
  const [ready,setReady]=useState(false);
  useEffect(()=>{const sync=()=>{setItems(readWishlist());setReady(true);};sync();
    window.addEventListener('storage',sync);window.addEventListener('xiii-wishlist-updated',sync);
    return()=>{window.removeEventListener('storage',sync);window.removeEventListener('xiii-wishlist-updated',sync);};
  },[]);
  return {items,ready};
}
