import {env} from 'cloudflare:workers';
import {normalizeSchedule,dateOK} from './schedule';
import {builtinAreas} from './areas';
export async function run(owner:string, action:string, data:any={}){
 const db=env.DB!;
 if(!owner)throw Error('Sign in required');
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh'}).format(new Date());
 const get=async(kind:string,id:string)=>{const row:any=await db.prepare('SELECT payload FROM records WHERE id=? AND owner=? AND kind=?').bind(owner+':'+kind+':'+id,owner,kind).first();return row?JSON.parse(row.payload):null};
 const put=async(kind:string,item:any)=>{await db.prepare('INSERT INTO records(id,owner,kind,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(owner+':'+kind+':'+item.id,owner,kind,JSON.stringify(item)).run();return item};
 if(['area_remove','area_restore','area'].includes(action)){
 const id=String(data.id|| (action==='area'?crypto.randomUUID():''));if(!id||id.length>180)throw Error('Invalid area ID');
 const existing=await get('area',id);
 if(action==='area_restore'){if(!existing)throw Error('Life area not found');return put('area',{...existing,removed:false})}
 if(action==='area_remove'){
 if(!existing&&!builtinAreas.includes(id))throw Error('Life area not found');
 return put('area',{...(existing||{id}),removed:true});
 }
 if(existing?.removed)throw Error('Restore this area before editing');
 if(!String(data.name||'').trim())throw Error('Name required');return put('area',{...(existing||{}),id,name:String(data.name).trim().slice(0,120),removed:false});
 }

 if(action==='read'){const r=await db.prepare('SELECT kind,payload FROM records WHERE owner=?').bind(owner).all();return r.results.map((x:any)=>({...JSON.parse(x.payload),kind:x.kind}));}
 if(['draft','approve','discard'].includes(action)){
 const id=String(data.id||crypto.randomUUID());
 if(id.length>180)throw Error('Invalid ID');
 const key=owner+':update:'+id;
 const existing:any=await db.prepare('SELECT payload FROM records WHERE id=? AND owner=?').bind(key,owner).first();
 const old=existing?JSON.parse(existing.payload):null;
 if(action==='draft'&&old)return old;
 if(action!=='draft'&&old?.stage!=='draft')throw Error('Refresh the review queue');
 const d={...old,...data,id};
 if(!String(d.name||'').trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||new Date(d.date+'T12:00Z').toISOString().slice(0,10)!==d.date)throw Error('Invalid activity or date');
 const item={id,name:String(d.name).trim().slice(0,300),date:d.date,category:String(d.category||''),note:String(d.note||'').slice(0,2000),raw:String(old?.raw||d.raw||d.name).slice(0,5000),habitId:String(d.habitId||''),unit:String(d.unit||'').slice(0,80),value:d.value??null,status:d.status||'done',stage:action==='draft'?'draft':action==='approve'?'approved':'discarded'};
 if(item.value!==null&&(!Number.isFinite(item.value)||item.value<0))throw Error('Invalid amount');
 if(!['done','partial','skipped'].includes(item.status))throw Error('Invalid status');
 if(action==='draft'){await db.prepare('INSERT OR IGNORE INTO records VALUES(?,?,?,?)').bind(key,owner,'update',JSON.stringify(item)).run();return item}
 const writes=[];
 if(action==='approve'&&item.habitId){
 const habit:any=await db.prepare('SELECT payload FROM records WHERE id=? AND owner=?').bind(owner+':habit:'+item.habitId,owner).first();
 if(!habit||item.value===null)throw Error('A linked habit requires an amount');
 const h=JSON.parse(habit.payload);const goal=h.goalIds?.length?await get('goal',h.goalIds[0]):null;item.category=goal?.areaIds?.[0]||h.category||item.category;item.unit=h.unit;
 const entry={id:item.habitId+'_'+item.date,habitId:item.habitId,date:item.date,value:item.value,note:item.note,status:item.status};
 writes.push(db.prepare("INSERT INTO records SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND payload=?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").bind(owner+':entry:'+entry.id,owner,'entry',JSON.stringify(entry),key,existing.payload));
 }
 writes.push(db.prepare('UPDATE records SET payload=? WHERE id=? AND payload=?').bind(JSON.stringify(item),key,existing.payload));
 const result=await db.batch(writes);if(!result[result.length-1].meta.changes)throw Error('Already reviewed');
 return item;
 }
 let kind=action==='habit'?'habit':action==='goal'?'goal':'entry';
 if(!['habit','goal','entry'].includes(action))throw Error('Unknown action');
 if(action==='entry'){
 if(typeof data.habitId!=='string'||!dateOK(data.date)||!Number.isFinite(data.value)||data.value<0)throw Error('Invalid entry');
 const h=await db.prepare('SELECT payload FROM records WHERE id=? AND owner=? AND kind=?').bind(owner+':habit:'+data.habitId,owner,'habit').first();if(!h)throw Error('Habit not found');
 if(data.status&&!['done','partial','skipped'].includes(data.status))throw Error('Invalid status');
 data={habitId:data.habitId,date:data.date,value:data.value,status:data.status||'done',note:String(data.note||'').slice(0,1000),id:data.habitId+'_'+data.date};
 }else{if(!String(data.name||'').trim()||!Number.isFinite(data.target)||data.target<=0)throw Error('Name and positive target required');
 data={...data,id:data.id||crypto.randomUUID(),name:String(data.name).slice(0,150),created:data.created||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh'}).format(new Date())};
 if(action==='goal'&&(!Number.isFinite(data.baseline)||!Number.isFinite(data.current)||data.target===data.baseline))throw Error('Invalid goal values');
 const previous=await get(action,data.id);data.created=previous?.created||now;
 if(action==='goal'){
 data.areaIds=[...new Set<string>(data.areaIds||[data.category||'مالیات'])];
 if(!data.areaIds.length||data.areaIds.some((a:any)=>typeof a!=='string'))throw Error('Choose life areas');
 const allowed=['مالیات','Learning','دوستی','صحت و فٹنس','تعلیم و سیکھنا','ہنر و تخلیق','خاندان','کیریئر','ذہنی و روحانی بہبود','تفریح'];
 for(const id of data.areaIds){
 const area=await get('area',id);
 if(!allowed.includes(id)&&id!==previous?.category&&!area)throw Error('Life area not found');
 if(area?.removed&&!(previous?.areaIds||[previous?.category]).includes(id))throw Error('Choose an active life area');
 }
 data.category=data.areaIds[0];
 }
 if(action==='habit'){
 data.goalIds=[...new Set<string>(data.goalIds||previous?.goalIds||[])];
 for(const id of data.goalIds)if(typeof id!=='string'||!await get('goal',id))throw Error('Linked goal not found');
 data.schedule=normalizeSchedule(data.schedule||previous?.schedule,data.created);
 const oldPlans=previous?.plans|| (previous?[{effective:previous.created,schedule:previous.schedule||{type:'daily',start:previous.created},target:previous.target}]:[]);
 data.plans=[...oldPlans];
 if(!previous||JSON.stringify(data.schedule)!==JSON.stringify(previous.schedule)||data.target!==previous.target){
 data.plans=data.plans.filter((v:any)=>v.effective<now);data.plans.push({effective:now,schedule:data.schedule,target:data.target});
 }
 }

 }
 await db.prepare('INSERT INTO records(id,owner,kind,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(owner+':'+kind+':'+data.id,owner,kind,JSON.stringify(data)).run();return data;
}
