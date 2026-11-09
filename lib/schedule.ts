export type Schedule={type:'daily'|'weekly'|'weekdays'|'biweekly'|'monthly',start:string,days?:number[],monthDay?:number};
export const dateOK=(d:unknown):d is string=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const x=new Date(d+'T12:00:00Z');return !isNaN(x.getTime())&&x.toISOString().slice(0,10)===d};
export const dayShift=(d:string,n:number)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
export function normalizeSchedule(s:any,start:string):Schedule{
 if(!s)s={type:'daily',start};
 if(!['daily','weekly','weekdays','biweekly','monthly'].includes(s.type)||!dateOK(s.start))throw Error('Invalid schedule');
 const days=[...new Set<number>(s.days||[])];
 if(days.some(d=>!Number.isInteger(d)||d<0||d>6)||s.type==='weekdays'&&!days.length)throw Error('Choose at least one weekday');
 const monthDay=s.monthDay??Number(s.start.slice(8));if(!Number.isInteger(monthDay)||monthDay<1||monthDay>31)throw Error('Invalid day of month');
 return {type:s.type,start:s.start,days,monthDay};
}
export function planOn(h:any,d:string){
 const versions=h.plans||[];const v=[...versions].reverse().find((v:any)=>v.effective<=d);
 return v||{schedule:h.schedule||{type:'daily',start:h.created},target:h.target};
}
export function scheduled(h:any,d:string):boolean{
 if(!dateOK(d)||d<h.created)return false;const s=planOn(h,d).schedule;if(!s||!dateOK(s.start)||d<s.start)return false;
 const diff=Math.round((Date.parse(d+'T12:00Z')-Date.parse(s.start+'T12:00Z'))/86400000);
 if(s.type==='daily')return true;
 if(s.type==='weekdays')return s.days.includes(new Date(d+'T12:00Z').getUTCDay());
 if(s.type==='weekly')return diff%7===0;
 if(s.type==='biweekly')return diff%14===0;
 const month=new Date(d+'T12:00Z');const last=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
 return Number(d.slice(8))===Math.min(s.monthDay||Number(s.start.slice(8)),last);
}
export function achieved(h:any,e:any,d:string){return !!e&&e.status!=='skipped'&&e.value>=planOn(h,d).target}
export function dayState(h:any,e:any,d:string,now:string){
 if(!scheduled(h,d))return 'notScheduled';if(!e)return d>now?'upcoming':'unlogged';
 if(achieved(h,e,d))return 'achieved';if(e.status==='skipped'||d<now)return 'notAchieved';return 'inProgress';
}
export function goalAreas(g:any){return g.areaIds?.length?g.areaIds:g.category?[g.category]:[]}
export function habitAreas(h:any,goals:any[]){return [...new Set<string>([...(h.category?[h.category]:[]),...(h.goalIds||[]).flatMap((id:string)=>goalAreas(goals.find(g=>g.id===id)||{}))])];}
