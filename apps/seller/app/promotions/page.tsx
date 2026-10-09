import { SellerPromotionsClient } from '../../components/seller-promotions-client';
import { SellerShell } from '../../components/seller-shell';

export default function PromotionsPage(){
  return <SellerShell active="promotions"><SellerPromotionsClient/></SellerShell>;
}
