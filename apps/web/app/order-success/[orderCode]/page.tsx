import { SiteHeader } from '../../../components/site-header';
import { OrderSuccessClient } from '../../../components/order-success-client';

export default async function OrderSuccessPage({params}:{params:Promise<{orderCode:string}>}){
  const {orderCode}=await params;
  return <><SiteHeader/><main className="success-shell"><OrderSuccessClient orderCode={orderCode}/></main></>;
}
