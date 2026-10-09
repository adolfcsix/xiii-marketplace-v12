'use client';
import { FormEvent,useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { clientApi,hasSession } from '../lib/client-api';
import { buyerSocket } from '../lib/realtime';
import { SendIcon } from './icons';

type Conversation={_id:string;lastMessage:string;lastMessageAt:string;unreadCount:number;shop?:{name:string;logo?:string;verified?:boolean};buyer?:{fullName:string};product?:{name:string;slug:string;images?:string[]};order?:{orderCode:string;status:string}};
type Message={_id:string;conversationId:string;senderId:string;senderRole:'BUYER'|'SELLER';type:string;text:string;attachments?:string[];createdAt:string;readAt?:string|null};
type List<T>={items:T[];meta:{total:number}};
type MessagePage={conversation:Conversation;items:Message[];meta:{total:number}};
const time=(v?:string)=>v&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(new Date(v)):'';
const initials=(name:string)=>{const words=name.trim().split(/\s+/);return (words[0]?.[0]||'S')+(words.length>1?words[words.length-1][0]:words[0]?.[1]||'');};
const mergeMessages=(rows:Message[],incoming:Message[])=>Array.from(new Map([...rows,...incoming].map(row=>[row._id,row])).values()).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));

export function ChatClient(){
  const [conversations,setConversations]=useState<Conversation[]>([]),[selected,setSelected]=useState(''),[messages,setMessages]=useState<Message[]>([]),[drafts,setDrafts]=useState<Record<string,string>>({}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false);
  const [listError,setListError]=useState(''),[messageLoading,setMessageLoading]=useState(false),[messageError,setMessageError]=useState('');
  const selectedRef=useRef(''),sendLock=useRef(false),listVersion=useRef(0),messageVersion=useRef(0),messageController=useRef<AbortController|null>(null),thread=useRef<HTMLDivElement>(null),follow=useRef(true);
  const text=drafts[selected]||'';
  const current=useMemo(()=>conversations.find(c=>c._id===selected)||null,[conversations,selected]);
  const loadConversations=useCallback(async()=>{
    if(!hasSession()){location.href='/login?next=%2Faccount%2Fmessages';return;}
    const version=++listVersion.current;setListError('');
    try{const data=await clientApi<List<Conversation>>('/chat/conversations?limit=100');if(version!==listVersion.current)return;
      setConversations(data.items);const wanted=selectedRef.current||new URLSearchParams(location.search).get('conversation')||'';
      const id=data.items.some(row=>row._id===wanted)?wanted:data.items[0]?._id||'';selectedRef.current=id;setSelected(id);
    }catch(e){if(version===listVersion.current)setListError(e instanceof Error?e.message:'Không tải được hội thoại');}
    finally{if(version===listVersion.current)setLoading(false);}
  },[]);
  const loadMessages=useCallback(async(id:string)=>{
    messageController.current?.abort();const controller=new AbortController();messageController.current=controller;
    const version=++messageVersion.current;setMessageLoading(true);setMessageError('');
    try{const data=await clientApi<MessagePage>(`/chat/conversations/${encodeURIComponent(id)}/messages?limit=100`,{signal:controller.signal});
      if(controller.signal.aborted||version!==messageVersion.current||selectedRef.current!==id)return;
      setMessages(rows=>mergeMessages(data.items,rows.filter(row=>row.conversationId===id)));setMessageLoading(false);
      await clientApi(`/chat/conversations/${encodeURIComponent(id)}/read`,{method:'PATCH',body:'{}',signal:controller.signal});
      if(!controller.signal.aborted&&version===messageVersion.current)setConversations(rows=>rows.map(r=>r._id===id?{...r,unreadCount:0}:r));
    }catch(e){if(!controller.signal.aborted&&version===messageVersion.current)setMessageError(e instanceof Error?e.message:'Không tải được tin nhắn');}
    finally{if(!controller.signal.aborted&&version===messageVersion.current)setMessageLoading(false);}
  },[]);
  useEffect(()=>{void loadConversations();return()=>{listVersion.current++;messageVersion.current++;messageController.current?.abort();};},[loadConversations]);
  useEffect(()=>{
    setMessages([]);setError('');follow.current=true;
    if(!selected)return;void loadMessages(selected);const s=buyerSocket();
    const onMessage=(m:Message)=>{if(m.conversationId===selectedRef.current){setMessages(rows=>mergeMessages(rows,[m]));if(m.senderRole==='SELLER')void clientApi(`/chat/conversations/${encodeURIComponent(m.conversationId)}/read`,{method:'PATCH',body:'{}'}).catch(()=>{});}void loadConversations();};
    const onRead=(event:{conversationId:string;readerRole:string;readAt:string})=>{if(event.conversationId===selectedRef.current&&event.readerRole==='SELLER')setMessages(rows=>rows.map(row=>row.senderRole==='BUYER'?{...row,readAt:row.readAt||event.readAt}:row));};
    s?.emit('chat:join',{conversationId:selected,actorRole:'BUYER'});s?.on('chat:message',onMessage);s?.on('chat:read',onRead);
    const reconnect=()=>{s?.emit('chat:join',{conversationId:selectedRef.current,actorRole:'BUYER'});void loadMessages(selectedRef.current);};s?.on('connect',reconnect);
    return()=>{messageController.current?.abort();messageVersion.current++;s?.off('chat:message',onMessage);s?.off('chat:read',onRead);s?.off('connect',reconnect);};
  },[selected,loadMessages,loadConversations]);
  useEffect(()=>{if(follow.current&&thread.current)thread.current.scrollTop=thread.current.scrollHeight;},[messages,messageLoading]);
  async function send(e:FormEvent){
    e.preventDefault();const id=selectedRef.current,value=text.trim(),snapshot=text;if(!id||!value||sendLock.current)return;
    sendLock.current=true;setSending(true);setError('');follow.current=true;
    try{const message=await clientApi<Message>(`/chat/conversations/${encodeURIComponent(id)}/messages`,{method:'POST',body:JSON.stringify({text:value,type:'TEXT'})});
      if(selectedRef.current===id)setMessages(rows=>mergeMessages(rows,[message]));
      setDrafts(rows=>rows[id]===snapshot?{...rows,[id]:''}:rows);
      setConversations(rows=>rows.map(row=>row._id===id?{...row,lastMessage:message.text,lastMessageAt:message.createdAt}:row));
    }catch(e){if(selectedRef.current===id)setError(e instanceof Error?e.message:'Không gửi được tin nhắn');}
    finally{sendLock.current=false;setSending(false);}
  }
  function choose(id:string){if(id===selectedRef.current)return;selectedRef.current=id;messageController.current?.abort();messageVersion.current++;setMessages([]);setMessageLoading(true);setSelected(id);history.replaceState(history.state,'',`/account/messages?conversation=${encodeURIComponent(id)}`);}
  return <section className="chat-page"><header className="chat-page-head"><div><span>REALTIME CHAT</span><h1>Tin nhắn</h1><p>Trao đổi trực tiếp với shop về sản phẩm và đơn hàng.</p></div><a href="/account/orders">Đơn mua →</a></header>{error&&<div className="chat-alert" role="alert">{error}</div>}<div className="chat-layout"><aside className="chat-list"><div className="chat-list-title"><b>Hội thoại</b><span>{conversations.length}</span></div>{loading?<div className="chat-empty">Đang tải…</div>:listError?<div className="chat-empty" role="alert"><b>{listError}</b><button className="account-retry" onClick={()=>{setLoading(true);void loadConversations();}}>Thử lại</button></div>:conversations.length===0?<div className="chat-empty"><b>Chưa có tin nhắn</b><span>Nhấn “Chat với shop” ở trang sản phẩm để bắt đầu.</span></div>:conversations.map(c=><button key={c._id} aria-label={'Hội thoại với '+(c.shop?.name||'Shop')} title={c.shop?.name||'Shop'} onClick={()=>choose(c._id)} className={selected===c._id?'active':''}><span className="chat-avatar">{initials(c.shop?.name||'Shop').toUpperCase()}</span><span className="chat-list-copy"><strong>{c.shop?.name||'Shop'} {c.shop?.verified?'✓':''}</strong><small>{c.lastMessage||'Hội thoại mới'}</small><em>{time(c.lastMessageAt)}</em></span>{c.unreadCount>0&&<i>{c.unreadCount>99?'99+':c.unreadCount}</i>}</button>)}</aside><main className="chat-thread">{!current?<div className="chat-thread-empty"><b>Chọn một hội thoại</b><span>Tin nhắn realtime sẽ hiển thị ở đây.</span></div>:<><header><div className="chat-avatar large">{initials(current.shop?.name||'Shop').toUpperCase()}</div><div><b>{current.shop?.name||'Shop'} {current.shop?.verified?'✓':''}</b><small>{current.product?`Đang hỏi: ${current.product.name}`:current.order?`Đơn ${current.order.orderCode}`:'Seller trên XIII'}</small></div>{current.product?.slug&&<a href={'/product/'+current.product.slug}>Xem sản phẩm</a>}</header><div className="chat-messages" ref={thread} aria-busy={messageLoading} onScroll={()=>{const node=thread.current;if(node)follow.current=node.scrollHeight-node.scrollTop-node.clientHeight<80;}}>{messageError&&<div className="chat-alert" role="alert">{messageError}<button className="account-retry" onClick={()=>void loadMessages(selected)}>Thử lại</button></div>}{messageLoading?<div className="chat-thread-empty compact" role="status"><span>Đang tải tin nhắn…</span></div>:messages.length===0?<div className="chat-thread-empty compact"><span>Bắt đầu cuộc trò chuyện với shop.</span></div>:messages.map(m=><div key={m._id} className={'chat-bubble-row '+(m.senderRole==='BUYER'?'mine':'theirs')}><div className="chat-bubble"><p>{m.text}</p><small>{time(m.createdAt)} {m.senderRole==='BUYER'&&m.readAt?'· Đã xem':''}</small></div></div>)}</div><form className="chat-compose" onSubmit={send}><input aria-label="Tin nhắn cho shop" value={text} onChange={e=>setDrafts(rows=>({...rows,[selected]:e.target.value}))} maxLength={2000} placeholder="Nhập tin nhắn cho shop…"/><button disabled={sending||!text.trim()} aria-label="Gửi"><SendIcon size={19}/></button></form></>}</main></div></section>;
}
