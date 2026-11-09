'use client';
import {useState} from 'react';
import {activeAreaIds} from '../lib/areas';
import {scheduled,achieved,dayShift,habitAreas} from '../lib/schedule';
import {areaName,primaryAreas,labels,messages,Lang} from './i18n';
const patterns=[/ریال|بچت|مالی|ريال|ادخار|مدخر|sav(e|ing)|sar|money/i,/عربی|زبان|مطالع|عربي|لغة|arabic|read|language/i,/دوست|صديق|friend|social/i,/واک|ورزش|صحت|مشی|مشي|walk|exercise|gym|صحي/i,/کورس|امتحان|دورة|اختبار|course|exam|school/i,/موسیقی|کی بورڈ|بیڈمنٹن|موسيقى|عزف|keyboard|music|badminton/i];
type Props={lang:Lang,rows:any[],date:string,busy:boolean,signedIn:boolean,save:(a:string,b:any)=>Promise<boolean>};
export default function Review({lang,rows,date,busy,signedIn,save}:Props){
 const t=labels[lang],m=messages[lang],[raw,setRaw]=useState(''),[working,setWorking]=useState(false);
 const customAreas=rows.filter(x=>x.kind==='area');const cat=(a:string)=>customAreas.find(x=>x.id===a)?.name||areaName(a,lang);
 const drafts=rows.filter(x=>x.kind==='update'&&x.stage==='draft'),habits=rows.filter(x=>x.kind==='habit');
 async function prepare(){
 setWorking(true);
 try{const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 for(const line of lines){
 const normalized=line.replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)-(c.charCodeAt(0)>=1776?1776:1632)));
 const match=normalized.match(/(\d+(?:[.٫]\d+)?)\s*(منٹ|دقیق[ةۃ]?|دقائق|ریال|ريال|minutes?|mins?|sar|km|کلومیٹر)\b/iu) || normalized.match(/(\d+(?:[.٫]\d+)?)\s*(منٹ|دقائق|دقيقة|ریال|ريال|کلومیٹر)/u);
 const h=habits.find(h=>line.toLowerCase().includes(h.name.toLowerCase()));
 const n=patterns.findIndex(re=>re.test(line));
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(date+'\n'+line));
 const id=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 if(!await save('draft',{id,raw:line,name:h?.name||(match?normalized.replace(match[0],'').trim()||line:line),date,category:h?.category||primaryAreas[n]||'',habitId:h?.id||'',value:match?Number(match[1].replace('٫','.')):null,unit:h?.unit||match?.[2]||''}))return;
 }setRaw('');}finally{setWorking(false)}
 }
 return <div className="review"><section className="habit"><h3>{t.raw}</h3><p>{t.hint}</p><textarea aria-label={t.raw} value={raw} onChange={e=>setRaw(e.target.value)} rows={3} dir="auto"/><button className="primary" disabled={!signedIn||!raw.trim()||busy||working} onClick={prepare}>{t.prepare}</button></section><h3>{t.pending} · {drafts.length}</h3>{!drafts.length&&<div className="empty">{t.empty}</div>}
 {drafts.map(d=><form className="habit" key={d.id} onSubmit={async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));await save('approve',{...f,id:d.id,value:f.value===''?null:Number(f.value)})}}>
 <small>{t.origin}</small><blockquote dir="auto">{d.raw}</blockquote>
 <label>{t.activity}<input required name="name" dir="auto" defaultValue={d.name}/></label>
 <div className="two"><label>{m.date}<input type="date" required name="date" defaultValue={d.date}/></label><label>{m.category}<select name="category" required defaultValue={d.category}><option value="">—</option>{Array.from(new Set([...activeAreaIds(rows,primaryAreas),...(d.category?[d.category]:[])])).map(a=><option key={a} value={a}>{cat(a)}</option>)}</select></label></div>
 <label>{t.link}<select name="habitId" defaultValue={d.habitId}><option value="">{t.none}</option>{habits.map(h=><option key={h.id} value={h.id}>{h.name} · {h.unit}</option>)}</select></label><small>{t.totalHint}</small>
 <div className="two"><label>{m.quantity}<input type="number" min="0" step="any" name="value" defaultValue={d.value??''}/></label><label>{m.unit}<input name="unit" defaultValue={d.unit}/></label></div>
 <label>{t.status}<select name="status" defaultValue={d.status}>{(['done','partial','skipped'] as const).map(s=><option key={s} value={s}>{t[s]}</option>)}</select></label><label>{m.note}<input name="note" dir="auto" defaultValue={d.note}/></label>
 <button disabled={busy} className="primary">{t.approve}</button> <button type="button" disabled={busy} onClick={()=>save('discard',{id:d.id})}>{t.discard}</button></form>)}</div>
}
export function timeline(rows:any[],lang:Lang){
 const habits=rows.filter(x=>x.kind==='habit');
 const items=rows.flatMap(x=>{
 if(x.kind==='entry'){const h=habits.find(h=>h.id===x.habitId);if(!h)return [];return [{...x,name:h.name,category:habitAreas(h,rows.filter(x=>x.kind==='goal'))[0]||'',unit:h.unit,status:x.status==='skipped'?'skipped':achieved(h,x,x.date)?'done':'partial',series:'habit:'+h.id}]}
 if(x.kind==='update'&&x.stage==='approved'&&!x.habitId)return [{...x,series:JSON.stringify([x.category,x.name.trim().toLowerCase(),x.unit])}];
 return []}).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const series=new Map<string,{days:Set<string>,last:number|null}>();
 return items.map(x=>{const s=series.get(x.series)||{days:new Set<string>(),last:null};const h=habits.find(h=>h.id===x.habitId);if(x.status==='done'&&(!h||scheduled(h,x.date)))s.days.add(x.date);let streak=0,d=x.date;while((!h||d>=h.created)){if(h&&!scheduled(h,d)){if(d===x.date)break;d=dayShift(d,-1);continue}if(!s.days.has(d))break;streak++;d=dayShift(d,-1)}
 const diff=x.value!=null&&s.last!=null?x.value-s.last:null;if(x.value!=null)s.last=x.value;series.set(x.series,s);return {...x,streak,diff,statusText:labels[lang][x.status as 'done'|'partial'|'skipped']}}).reverse()
}
