import {goalAreas} from './schedule';
import {activeAreaIds} from './areas';
export function directionMap(rows:any[],defaults:string[]){
 const north=rows.find(r=>r.kind==='northstar');const areas=activeAreaIds(rows,defaults);
 const goals=rows.filter(r=>r.kind==='goal'),habits=rows.filter(r=>r.kind==='habit');
 const contributingAreas=areas.filter(id=>north?.areaIds?.includes(id));
 const contributingGoals=goals.filter(g=>goalAreas(g).some((id:string)=>contributingAreas.includes(id)));
 const goalSet=new Set(contributingGoals.map(g=>g.id));
 const contributingHabits=habits.filter(h=>h.goalIds?.some((id:string)=>goalSet.has(id)));
 return {north,areas,goals,habits,contributingAreas,contributingGoals,contributingHabits,
 areaRows:areas.map(id=>{const gs=goals.filter(g=>goalAreas(g).includes(id)),set=new Set(gs.map(g=>g.id));return {id,supportsNorth:contributingAreas.includes(id),goals:gs,habits:habits.filter(h=>h.goalIds?.some((g:string)=>set.has(g)))}}),
 goalRows:goals.map(g=>({goal:g,supportsNorth:goalSet.has(g.id),habits:habits.filter(h=>h.goalIds?.includes(g.id))})),
 habitRows:habits.map(h=>({habit:h,goals:goals.filter(g=>h.goalIds?.includes(g.id)),supportsNorth:contributingHabits.some(v=>v.id===h.id)}))};
}
