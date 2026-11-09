import {getChatGPTUser} from '../../chatgpt-auth';
import {run} from '../../../lib/tracker';
export async function GET(){const u=await getChatGPTUser();if(!u)return Response.json({error:'Sign in required'},{status:401});return Response.json(await run(u.userId,'read'));}
export async function POST(req:Request){const u=await getChatGPTUser();if(!u)return Response.json({error:'Sign in required'},{status:401});try{const {action,data}:any=await req.json();return Response.json(await run(u.userId,action,data));}catch(e){return Response.json({error:String(e)},{status:400});}}
