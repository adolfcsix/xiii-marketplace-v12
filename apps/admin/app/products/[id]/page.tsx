import { AdminProductDetailClient } from '../../../components/admin-product-detail-client';
export default async function AdminProductReviewPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminProductDetailClient productId={id}/>}
