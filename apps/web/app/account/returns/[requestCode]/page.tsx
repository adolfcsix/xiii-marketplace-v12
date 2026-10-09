import { ReturnDetailClient } from '../../../../components/return-detail-client';

export default async function Page({ params }: { params: Promise<{ requestCode: string }> }) {
  const { requestCode } = await params;
  return <main className="orders-shell"><ReturnDetailClient requestCode={requestCode}/></main>;
}
