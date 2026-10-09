'use client';
import { io, Socket } from 'socket.io-client';
import { API } from './client-api';
import { refreshAccessToken } from './client-api';
let socket: Socket | null = null;
function socketUrl(){return process.env.NEXT_PUBLIC_SOCKET_URL || API.replace(/\/api\/v1\/?$/,'');}
export function sellerSocket(){
  const token=localStorage.getItem('xiii_seller_access');
  if(!token)return null;
  if(socket){if(socket.auth && (socket.auth as {token?:string}).token!==token)socket.disconnect();socket.auth={token};if(!socket.connected)socket.connect();return socket;}
  socket=io(socketUrl()+'/realtime',{auth:{token},transports:['websocket','polling'],autoConnect:true});
  const current=socket;
  current.on('disconnect',async reason=>{
    if(reason!=='io server disconnect'||socket!==current)return;
    try{const fresh=await refreshAccessToken();if(fresh&&socket===current){current.auth={token:fresh};if(!current.connected)current.connect();}}catch{/* HTTP retry or a later token refresh restores the connection. */}
  });
  window.addEventListener('xiii-seller-token-refreshed',onTokenRefreshed);
  return socket;
}
function onTokenRefreshed(){if(socket)sellerSocket();}
export function disconnectSellerSocket(){
  window.removeEventListener('xiii-seller-token-refreshed',onTokenRefreshed);
  if(!socket)return;
  socket.removeAllListeners();
  socket.disconnect();
  socket=null;
}
