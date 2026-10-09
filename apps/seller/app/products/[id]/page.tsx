import { SellerProductEditorClient } from '../../../components/seller-product-editor-client';
export default async function EditProductPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <SellerProductEditorClient productId={id}/>}
