export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type Envelope<T> = { success: boolean; data?: T; meta?: Record<string, unknown>; message?: string; code?: string };
const requestOrigin=()=>typeof window==='undefined'?(process.env.API_INTERNAL_URL||API):API;
export class ApiError extends Error {
  constructor(message:string, public status:number){super(message);}
}
async function responseEnvelope<T>(response:Response):Promise<Envelope<T>>{
  let json:Envelope<T>;
  try{json=await response.json();}catch{throw new ApiError('Máy chủ chưa phản hồi hợp lệ. Vui lòng thử lại.',response.status);}
  if(!json||!response.ok||!json.success)throw new ApiError(json?.message||json?.code||'Không thể tải dữ liệu. Vui lòng thử lại.',response.status);
  return json;
}
export async function api<T>(path:string,init?:RequestInit):Promise<T>{
  const headers=new Headers(init?.headers);if(!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const response=await fetch(requestOrigin()+path,{...init,headers,signal:init?.signal??AbortSignal.timeout(12000),cache:init?.cache??'no-store'});
  return (await responseEnvelope<T>(response)).data as T;
}
export async function apiPage<T>(path:string,init?:RequestInit):Promise<{data:T;meta?:Record<string,unknown>}>{
  const response=await fetch(requestOrigin()+path,{...init,cache:'no-store',signal:init?.signal??AbortSignal.timeout(12000)});
  const json=await responseEnvelope<T>(response);return {data:json.data as T,meta:json.meta};
}
