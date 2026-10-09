import { NewReturnClient } from '../../../../components/new-return-client';

export default async function Page({ searchParams }: { searchParams: Promise<{ subOrderCode?: string }> }) {
  const query = await searchParams;
  return <main className="orders-shell"><NewReturnClient subOrderCode={query.subOrderCode || ''}/></main>;
}
