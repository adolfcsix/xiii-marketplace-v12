import { SiteHeader } from '../../components/site-header';
import { CartClient } from '../../components/cart-client';

export default function CartPage(){
  return <><SiteHeader/><main className="cart-shell"><CartClient/></main></>;
}
