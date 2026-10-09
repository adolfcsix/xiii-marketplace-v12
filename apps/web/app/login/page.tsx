'use client';
import Link from 'next/link';
import { MotionToggle } from '../../components/street-motion';
import { useRef, useState } from 'react';
import { safeNextPath } from '../../lib/navigation';
import { api } from '../../lib/api';
type LoginResult={user:{id?:string;fullName:string;email?:string;roles?:string[]};accessToken:string;refreshToken:string};
export default function Login(){
  const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);const working=useRef(false);
  const [register,setRegister]=useState(false);const [visible,setVisible]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(working.current)return;working.current=true;setBusy(true);setMsg('');
    const data=new FormData(event.currentTarget);
    try{
      const result=await api<LoginResult>(register?'/auth/register':'/auth/login',{method:'POST',body:JSON.stringify({email:String(data.get('email')).trim(),password:data.get('password'),...(register?{fullName:String(data.get('fullName')).trim()}: {})})});
      localStorage.setItem('xiii_access',result.accessToken);localStorage.setItem('xiii_refresh',result.refreshToken);localStorage.setItem('xiii_user',JSON.stringify(result.user));
      window.location.href=safeNextPath(new URLSearchParams(window.location.search).get('next'));
    }catch(error){const message=error instanceof Error?error.message:'Vui lòng thử lại.';setMsg(({INVALID_CREDENTIALS:'Email hoặc mật khẩu chưa đúng.',EMAIL_EXISTS:'Email này đã được đăng ký.',ACCOUNT_NOT_ACTIVE:'Tài khoản hiện chưa hoạt động.'} as Record<string,string>)[message]||message);}
    finally{working.current=false;setBusy(false);}
  }
  return <main className="auth-page"><section className="auth-editorial"><img className="auth-scene" src="/street/hero.webp" alt="" fetchPriority="high"/><Link className="xiii-logo" href="/">XIII</Link><span>YOUR OWN WAY. YOUR OWN SPACE.</span><h1>GU RIÊNG.<br/><em>KHÔNG GIỚI HẠN.</em></h1><p>Mặc điều bạn thích.<br/>Sống theo cách của bạn.</p><div className="auth-stamp" aria-hidden="true">NO RULES.<br/>JUST YOU.</div><div className="auth-motion"><MotionToggle/></div></section><section className="auth-form-panel"><Link className="auth-back" href="/">← Tiếp tục khám phá</Link><div className="auth-card" data-reveal><span>YOUR SPACE / XIII</span><h2>{register?'Bắt đầu với XIII.':'Chào bạn trở lại.'}</h2><p>{register?'Tạo tài khoản để lưu đơn mua và kết nối với shop.':'Đăng nhập để tiếp tục hành trình của bạn.'}</p><form onSubmit={submit} key={register?'register':'login'} className="auth-fields">
    {register&&<label>Họ và tên<input name="fullName" autoComplete="name" required minLength={2} maxLength={120} placeholder="Tên của bạn" disabled={busy}/></label>}
    <label>Email<input name="email" type="email" autoComplete="email" required placeholder="ban@example.com" disabled={busy}/></label>
    <div className="auth-password-field"><label htmlFor="buyer-password">Mật khẩu</label><div className="auth-password"><input id="buyer-password" name="password" type={visible?'text':'password'} autoComplete={register?'new-password':'current-password'} required minLength={register?8:undefined} placeholder={register?'Ít nhất 8 ký tự':'Mật khẩu của bạn'} disabled={busy}/><button type="button" aria-label={visible?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?'Ẩn':'Hiện'}</button></div></div>
    {msg&&<div className="auth-error" role="alert">{msg}</div>}<button className="auth-submit" disabled={busy}>{busy?'Đang xử lý…':register?'Tạo tài khoản →':'Đăng nhập →'}</button>
  </form><p className="auth-switch">{register?'Đã có tài khoản?':'Chưa có tài khoản?'} <button type="button" disabled={busy} onClick={()=>{setRegister(v=>!v);setMsg('');}}>{register?'Đăng nhập':'Đăng ký'}</button></p><small>Kết nối với các local brand và phong cách của riêng bạn.</small></div></section></main>;
}
