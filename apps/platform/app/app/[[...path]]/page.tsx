import Dashboard from '@/components/dashboard';
import {getChatGPTUser} from '../../chatgpt-auth';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{path?:string[]}>}){const {path=[]}=await params;if(path.length>2||!['','projects','runs','scenarios','fixtures','connections','settings'].includes(path[0]??'')||(path.length===2&&path[0]!=='runs'))notFound();const user=await getChatGPTUser();return <Dashboard user={user?{name:user.displayName,email:user.email}:null}/>;}
