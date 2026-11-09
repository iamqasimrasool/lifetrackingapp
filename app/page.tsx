import Dashboard from './Dashboard';
import {getChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <Dashboard signedIn={!!user} displayName={user?.displayName||''}/>;}
