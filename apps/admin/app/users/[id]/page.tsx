import { AdminUserDetailClient } from '../../../components/admin-user-detail-client';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminUserDetailClient id={id}/>}
