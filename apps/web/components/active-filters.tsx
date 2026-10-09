'use client';
import {useEffect,useState} from 'react';
export function ActiveFilters({filters}:{filters:Array<{label:string;href:string}>}){
 const [pending,setPending]=useState(false);
 useEffect(()=>{const reset=()=>setPending(false);window.addEventListener('pageshow',reset);return()=>window.removeEventListener('pageshow',reset);},[]);
 function navigate(event:React.MouseEvent<HTMLAnchorElement>){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;if(pending){event.preventDefault();return;}setPending(true);}
 // GET navigation keeps the server-rendered catalog and filter URL in sync,
 // including before hydration and after browser back/forward restoration.
 return <div className="active-filter-row" aria-label="Bộ lọc đang áp dụng" aria-busy={pending}>{filters.map(filter=><a key={filter.label} href={filter.href} aria-label={'Bỏ bộ lọc '+filter.label} aria-disabled={pending} onClick={navigate}>{filter.label}<span aria-hidden="true">×</span></a>)}<a className="filter-reset" href="/search" aria-disabled={pending} onClick={navigate}>{pending?'Đang cập nhật…':'Xóa tất cả'}</a></div>;
}
