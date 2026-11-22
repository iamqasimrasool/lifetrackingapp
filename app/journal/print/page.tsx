import {requireChatGPTUser} from '../../chatgpt-auth';
import {run} from '../../../lib/tracker';
import {dateOK} from '../../../lib/schedule';
import {journalPrintModel} from '../../../lib/journal-print-model';
import JournalPrint from '../../JournalPrint';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const q=await searchParams;const date=dateOK(q.date)?q.date!:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh'}).format(new Date());const lang=q.lang==='ur'||q.lang==='ar'?q.lang:'en';const user=await requireChatGPTUser('/journal/print?date='+date+'&lang='+lang+(q.blank==='1'?'&blank=1':''));const rows=await run(user.userId,'read');return <JournalPrint model={journalPrintModel(rows,date,lang,q.blank==='1')}/>}
