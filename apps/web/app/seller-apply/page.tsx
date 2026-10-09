'use client';
import { useState } from 'react';
import { api } from '../../lib/api';
export default function Apply(){
  const [msg,setMsg]=useState('');
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);const token=localStorage.getItem('xiii_access');
    try{await api('/seller/application',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({sellerType:'INDIVIDUAL',shopName:f.get('shopName'),identityType:'CCCD',identityNumber:f.get('identityNumber'),identityFrontImage:String(f.get('frontUrl')),identityBackImage:String(f.get('backUrl')),selfieImage:String(f.get('selfieUrl')),address:{province:f.get('province')}})});setMsg('Đã gửi hồ sơ seller. Trạng thái PENDING.')}catch(err){setMsg(err instanceof Error?err.message:'Lỗi')}
  }
  return <main className="shell"><div className="card" style={{maxWidth:620}}><h1>Đăng ký người bán — Phase 1</h1><p className="muted">Đăng nhập trước. Phase này nhận URL tài liệu; upload file thật sẽ được nối với object storage ở phase sau.</p><form onSubmit={submit}><p><input name="shopName" className="input" placeholder="Tên shop" required/></p><p><input name="identityNumber" className="input" placeholder="Số CCCD" required/></p><p><input name="frontUrl" className="input" placeholder="URL ảnh CCCD mặt trước" required/></p><p><input name="backUrl" className="input" placeholder="URL ảnh CCCD mặt sau"/></p><p><input name="selfieUrl" className="input" placeholder="URL ảnh chân dung" required/></p><p><input name="province" className="input" placeholder="Tỉnh/Thành phố" required/></p><button className="btn">Gửi hồ sơ</button></form><p>{msg}</p></div></main>
}
