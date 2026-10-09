import { SiteHeader } from '../../components/site-header';
import { CheckoutClient } from '../../components/checkout-client';

export default function CheckoutPage(){
  return <><SiteHeader/><main className="checkout-shell"><CheckoutClient/></main></>;
}
