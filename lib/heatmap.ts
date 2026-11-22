import {dateOK,dayShift,scheduled,achieved,dayState,planOn} from './schedule';
export function yearDates(year:number){if(!Number.isInteger(year)||year<1900||year>2200)throw Error('Invalid year');const start=`${year}-01-01`,end=`${year}-12-31`,offset=(new Date(start+'T12:00Z').getUTCDay()+6)%7,first=dayShift(start,-offset);const count=Math.round((Date.parse(end)-Date.parse(first))/86400000)+1,columns=Math.ceil(count/7);return {start,end,first,columns,cells:Array.from({length:columns*7},(_,i)=>{const date=dayShift(first,i);return {date,inYear:date>=start&&date<=end,column:Math.floor(i/7),weekday:i%7}})};}
export function habitHeatmap(habit:any,entries:any[],year:number,today:string){
 const calendar=yearDates(year),byDate=new Map<string,any>();for(const e of entries)if(e.habitId===habit.id&&dateOK(e.date))byDate.set(e.date,e);
 let due=0,done=0,logged=0,total=0;const cells=calendar.cells.map(cell=>{const e=byDate.get(cell.date),target=Number(planOn(habit,cell.date).target)||0,state=cell.date>today?(scheduled(habit,cell.date)?'upcoming':'notScheduled'):dayState(habit,e,cell.date,today),ratio=e&&target>0?Math.max(0,Math.min(1,e.value/target)):0;
 if(cell.inYear&&cell.date<=today){if(e)total+=Number(e.value)||0;if(scheduled(habit,cell.date)){due++;if(e)logged++;if(achieved(habit,e,cell.date))done++}}
 return {...cell,entry:e,target,state,ratio,today:cell.date===today,editable:cell.inYear&&cell.date>=habit.created&&cell.date<=today};});
 const end=calendar.end<today?calendar.end:today;let streak=0;
 if(dateOK(habit.created)&&habit.created<=end&&calendar.start<=today){for(let d=end;d>=habit.created;d=dayShift(d,-1)){if(!scheduled(habit,d))continue;const e=byDate.get(d);if(d===today&&!achieved(habit,e,d)&&e?.status!=='skipped')continue;if(!achieved(habit,e,d))break;streak++}}
 return {calendar,cells,due,done,logged,total,unknown:due-logged,completion:due?Math.round(done/due*100):null,streak};
}
