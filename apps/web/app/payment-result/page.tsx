import { SiteHeader } from '../../components/site-header';
import { PaymentResultClient } from '../../components/payment-result-client';

export default async function PaymentResultPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;
  const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]||'':value||'';
  return <><SiteHeader/><main className="payment-result-shell"><PaymentResultClient orderCode={one(query.orderCode)} provider={one(query.provider)} setupError={one(query.setupError)}/></main></>;
}
