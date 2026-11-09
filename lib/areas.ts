export const builtinAreas=['مالیات','Learning','دوستی','صحت و فٹنس','تعلیم و سیکھنا','ہنر و تخلیق','خاندان','کیریئر','ذہنی و روحانی بہبود','تفریح'];
export const areaRemoved=(rows:any[],id:string)=>rows.some(x=>x.kind==='area'&&x.id===id&&x.removed===true);
export function activeAreaIds(rows:any[],defaults:string[]){return [...new Set<string>([...defaults,...rows.filter(x=>x.kind==='area').map(x=>x.id),...rows.flatMap(x=>x.areaIds||[x.category]).filter(Boolean)])].filter(id=>!areaRemoved(rows,id))}
