'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="cart-state"><h1>Trang này đang gặp trục trặc.</h1><p>Bạn có thể thử lại sau ít giây.</p><button className="cart-checkout" onClick={reset}>Thử lại</button><Link href="/">Về trang chủ</Link></main>}
