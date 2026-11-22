import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {readPrivatePhoto} from '../../../../lib/journal';
export async function GET(_req:Request,context:{params:Promise<{id:string}>}){const user=await getChatGPTUser();const {id}=await context.params;return readPrivatePhoto(env.DB,env.BUCKET,user?.userId||'',id)}
