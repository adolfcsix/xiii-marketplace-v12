import { AdminPaymentDetailClient } from '../../../components/admin-payment-detail-client';

export default async function Page({ params }: { params: Promise<{ paymentCode: string }> }) {
  const { paymentCode } = await params;
  return <AdminPaymentDetailClient paymentCode={paymentCode}/>;
}
