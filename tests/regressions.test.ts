import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optionalNumber } from '../apps/web/lib/search-params';
import { safeNextPath } from '../apps/web/lib/navigation';
import * as buyer from '../apps/web/lib/client-api';
import * as seller from '../apps/seller/lib/client-api';
import * as admin from '../apps/admin/lib/client-api';
const originalFetch=globalThis.fetch;
const storage=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)},configurable:true});
Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true});
const response=(status:number,data?:unknown)=>new Response(JSON.stringify({success:status<400,data}),{status,headers:{'Content-Type':'application/json'}});
test('empty search parameters do not become a zero price ceiling',()=>{assert.equal(optionalNumber(undefined),undefined);assert.equal(optionalNumber(''),undefined);assert.equal(optionalNumber('  '),undefined);assert.equal(optionalNumber('0'),0);assert.equal(optionalNumber(['200000']),200000);assert.equal(optionalNumber('invalid'),undefined);assert.equal(optionalNumber('-1'),undefined);});
test('login next target only accepts internal paths',()=>{for(const path of ['//evil.example','/\\evil.example','/\n/evil.example','https://evil.example'])assert.equal(safeNextPath(path),'/');assert.equal(safeNextPath('/checkout?source=cart'),'/checkout?source=cart');});
for(const [role,prefix,call,clear] of [
 ['buyer','xiii',buyer.clientApi,buyer.clearBuyerSession],
 ['seller','xiii_seller',seller.sellerApi,seller.clearSellerSession],
 ['admin','xiii_admin',admin.adminApi,admin.clearAdminSession],
] as const){
 test(role+': temporary refresh failure preserves the local session',async()=>{storage.clear();storage.set(prefix+'_access','old');storage.set(prefix+'_refresh','keep');globalThis.fetch=async(url)=>String(url).endsWith('/auth/refresh')?response(503):response(401);try{await assert.rejects(call('/protected'));assert.equal(storage.get(prefix+'_refresh'),'keep');}finally{globalThis.fetch=originalFetch;clear('logout');}});
 test(role+': concurrent 401 responses share one refresh request',async()=>{storage.clear();storage.set(prefix+'_access','old');storage.set(prefix+'_refresh','refresh');let refreshes=0;globalThis.fetch=async(url,init)=>{if(String(url).endsWith('/auth/refresh')){refreshes++;await new Promise(r=>setTimeout(r,20));return response(200,{accessToken:'new',refreshToken:'rotated'});}return new Headers(init?.headers).get('Authorization')==='Bearer new'?response(200,{ok:true}):response(401);};try{const values=await Promise.all([call('/one'),call('/two')]);assert.deepEqual(values,[{ok:true},{ok:true}]);assert.equal(refreshes,1);}finally{globalThis.fetch=originalFetch;clear('logout');}});
 test(role+': an in-flight refresh cannot restore a logged-out session',async()=>{storage.clear();storage.set(prefix+'_access','old');storage.set(prefix+'_refresh','refresh');let release!:(value:Response)=>void;let started!:()=>void;const waiting=new Promise<void>(r=>started=r);globalThis.fetch=async(url)=>{if(String(url).endsWith('/auth/refresh')){started();return new Promise<Response>(r=>release=r);}return response(401);};try{const pending=call('/protected');await waiting;clear('logout');release(response(200,{accessToken:'new',refreshToken:'rotated'}));await assert.rejects(pending);assert.equal(storage.get(prefix+'_access'),undefined);assert.equal(storage.get(prefix+'_refresh'),undefined);}finally{globalThis.fetch=originalFetch;clear('logout');}});
 test(role+': Headers input and empty success responses are supported',async()=>{storage.clear();storage.set(prefix+'_access','token');globalThis.fetch=async(_url,init)=>{const headers=new Headers(init?.headers);assert.equal(headers.get('X-Trace'),'present');assert.equal(headers.get('Authorization'),'Bearer token');return new Response(null,{status:204});};try{assert.equal(await call('/empty',{headers:new Headers({'X-Trace':'present'})}),undefined);}finally{globalThis.fetch=originalFetch;clear('logout');}});
}
