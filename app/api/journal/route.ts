import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {saveJournal,privateHeaders,MAX_TOTAL_BYTES} from '../../../lib/journal';
export async function POST(req:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in required'},{status:401,headers:privateHeaders});
 try{const length=Number(req.headers.get('Content-Length')||0);if(length>MAX_TOTAL_BYTES+1024*1024)return Response.json({error:'PHOTO_LIMIT'},{status:413,headers:privateHeaders});
 const form=await req.formData();const data=JSON.parse(String(form.get('entry')||'{}'));const files=form.getAll('photos').filter((f):f is File=>typeof f!=='string');
 const item=await saveJournal(env.DB,env.BUCKET,user.userId,data,files);return Response.json(item,{headers:privateHeaders});
 }catch(e){const message=e instanceof Error?e.message:'Could not save';return Response.json({error:message},{status:message==='CONFLICT'?409:400,headers:privateHeaders})}
}
