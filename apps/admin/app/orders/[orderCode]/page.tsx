import { AdminOrderDetailClient } from '../../../components/admin-order-detail-client';

export default async function Page({ params }: { params: Promise<{ orderCode: string }> }) {
  const { orderCode } = await params;
  return <AdminOrderDetailClient orderCode={orderCode}/>;
}
