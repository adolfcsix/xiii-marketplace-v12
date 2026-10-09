import { SellerOrderDetailClient } from '../../../components/seller-order-detail-client';
export default async function SellerOrderDetailPage({params}:{params:Promise<{subOrderCode:string}>}){const {subOrderCode}=await params;return <SellerOrderDetailClient subOrderCode={subOrderCode}/>}
