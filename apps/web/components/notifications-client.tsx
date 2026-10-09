'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {clientApi,hasSession} from '../lib/client-api';
type Notification={_id:string;type:string;title:string;body:string;data?:Record<string,unknown>;readAt?:string|null;createdAt:string};
type Data={items:Notification[];unreadCount:number;meta:{total:number}};
const date=(value:string)=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'':new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(parsed);};
function href(n:Notification){const d=n.data||{};if(n.type==='CHAT_MESSAGE'&&d.conversationId)return '/account/messages?conversation='+encodeURIComponent(String(d.conversationId));if(d.returnCode||d.requestCode)return '/account/returns/'+encodeURIComponent(String(d.returnCode||d.requestCode));if(d.orderCode)return '/account/orders/'+encodeURIComponent(String(d.orderCode));if(n.type==='REVIEW')return '/account/reviews';return '#';}
export function NotificationsClient(){
 const [data,setData]=useState<Data|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState('');const lock=useRef(false);
 const load=useCallback(async()=>{if(!hasSession()){location.href='/login?next=%2Faccount%2Fnotifications';return;}setLoading(true);setError('');try{setData(await clientApi<Data>('/notifications?limit=100'));}catch(e){setError(e instanceof Error?e.message:'Không tải được thông báo');}finally{setLoading(false);}},[]);
 useEffect(()=>{load();},[load]);
 function changed(){window.dispatchEvent(new Event('xiii-notifications-updated'));}
 async function read(n:Notification){
  if(lock.current)return;lock.current=true;setBusy(n._id);setError('');
  try{if(!n.readAt){const updated=await clientApi<Notification>('/notifications/'+encodeURIComponent(n._id)+'/read',{method:'PATCH',body:'{}'});setData(current=>current?{...current,items:current.items.map(row=>row._id===n._id?updated:row),unreadCount:Math.max(0,current.unreadCount-1)}:current);changed();}
   const to=href(n);if(to!=='#')location.href=to;
  }catch(e){setError(e instanceof Error?e.message:'Không thể đánh dấu đã đọc. Hãy thử lại.');}finally{lock.current=false;setBusy('');}
 }
 async function all(){
  if(lock.current)return;lock.current=true;setBusy('all');setError('');
  try{await clientApi('/notifications/read-all',{method:'PATCH',body:'{}'});const readAt=new Date().toISOString();setData(current=>current?{...current,unreadCount:0,items:current.items.map(row=>({...row,readAt:row.readAt||readAt}))}:current);changed();}
  catch(e){setError(e instanceof Error?e.message:'Không thể đánh dấu tất cả đã đọc. Hãy thử lại.');}finally{lock.current=false;setBusy('');}
 }
 return <section className="notification-page"><header><div><span>NOTIFICATION CENTER / XIII</span><h1>Thông báo</h1><p>Đơn hàng, thanh toán, hậu mãi, đánh giá và chat trong một nơi.</p>{data&&<small className="notification-count" role="status">{data.unreadCount} thông báo chưa đọc</small>}</div><button onClick={all} disabled={Boolean(busy)||loading||!data?.unreadCount}>{busy==='all'?'Đang cập nhật…':'Đánh dấu đã đọc tất cả'}</button></header>
 {error&&<div className="chat-alert" role="alert">{error}{!data&&<button type="button" onClick={load} disabled={loading}>Thử lại</button>}</div>}
 {!data?loading?<div className="notification-empty" role="status">Đang tải thông báo…</div>:<div className="notification-empty"><b>Chưa tải được thông báo.</b><span>Kiểm tra kết nối và thử lại ở trên.</span></div>:data.items.length===0?<div className="notification-empty"><b>Chưa có thông báo.</b><span>Các sự kiện của tài khoản sẽ xuất hiện ở đây.</span></div>:<div className="notification-list" aria-busy={Boolean(busy)}>{data.items.map(n=><button key={n._id} disabled={Boolean(busy)} className={n.readAt?'':'unread'} onClick={()=>read(n)}><i aria-hidden="true">{n.readAt?'':'•'}</i><div><strong>{n.title}</strong><p>{n.body}</p><small>{n.type.replace(/_/g,' ')} · {date(n.createdAt)} · {n.readAt?'Đã đọc':'Chưa đọc'}</small></div><span aria-hidden="true">{busy===n._id?'…':'›'}</span></button>)}</div>}</section>;
}
