import {getChatGPTUser} from '../../../chatgpt-auth';
import {run} from '../../../../lib/tracker';
import {dateOK} from '../../../../lib/schedule';
import {privateHeaders} from '../../../../lib/journal';
import {journalPrintModel} from '../../../../lib/journal-print-model';
import {journalDocx} from '../../../../lib/journal-docx';
export async function GET(req:Request){const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in required'},{status:401,headers:privateHeaders});const q=new URL(req.url).searchParams,date=q.get('date');if(!dateOK(date))return Response.json({error:'Invalid date'},{status:400,headers:privateHeaders});const lang=q.get('lang')==='ur'?'ur':q.get('lang')==='ar'?'ar':'en';const model=journalPrintModel(await run(user.userId,'read'),date!,lang,q.get('blank')==='1');return new Response(journalDocx(model),{headers:{...privateHeaders,'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':`attachment; filename="Life_Journal_${date}.docx"`}})}
