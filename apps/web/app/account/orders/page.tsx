import { SiteHeader } from '../../../components/site-header';
import { OrdersClient } from '../../../components/orders-client';

export default function OrdersPage(){
  return <><SiteHeader/><main className="orders-shell"><OrdersClient/></main></>;
}
