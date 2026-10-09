import { SiteHeader } from '../../../../components/site-header';
import { OrderDetailClient } from '../../../../components/order-detail-client';

export default async function OrderDetailPage({params}:{params:Promise<{orderCode:string}>}){
  const {orderCode}=await params;
  return <><SiteHeader/><main className="orders-shell"><OrderDetailClient orderCode={orderCode}/></main></>;
}
