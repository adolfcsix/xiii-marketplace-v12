import { SellerReturnDetailClient } from '../../../components/seller-return-detail-client';

export default async function Page({ params }: { params: Promise<{ requestCode: string }> }) {
  const { requestCode } = await params;
  return <SellerReturnDetailClient requestCode={requestCode}/>;
}
