import {dateOK} from './schedule';
import {builtinAreas} from './areas';
export const MAX_PHOTOS=6,MAX_PHOTO_BYTES=8*1024*1024,MAX_TOTAL_BYTES=24*1024*1024;
export const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function record(db:any,owner:string,kind:string,id:string){const r=await db.prepare('SELECT payload FROM records WHERE id=? AND owner=? AND kind=?').bind(owner+':'+kind+':'+id,owner,kind).first();return r?JSON.parse(r.payload):null}
export async function validateLinks(db:any,owner:string,kind:string,ids:unknown){
 if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||id.length>180))throw Error('Invalid links');
 const unique=[...new Set<string>(ids)];
 for(const id of unique){if(kind==='area'&&builtinAreas.includes(id))continue;if(!await record(db,owner,kind,id))throw Error('Linked record not found')}
 return unique;
}
export async function saveNorthStar(db:any,owner:string,data:any){
 if(!owner)throw Error('Sign in required');const statement=String(data.statement||'').trim();if(!statement||statement.length>2000)throw Error('Write your North Star direction');
 const areaIds=await validateLinks(db,owner,'area',data.areaIds||[]);
 for(const id of areaIds)if((await record(db,owner,'area',id))?.removed)throw Error('Choose active life areas');
 const item={id:'main',statement,areaIds,updated:new Date().toISOString()};
 await db.prepare('INSERT INTO records(id,owner,kind,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(owner+':northstar:main',owner,'northstar',JSON.stringify(item)).run();return item;
}
export function imageType(bytes:Uint8Array){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 throw Error('Use JPEG, PNG or WebP photos');
}
export async function saveJournal(db:any,bucket:any,owner:string,data:any,files:File[]=[]){
 if(!owner)throw Error('Sign in required');if(!dateOK(data.date))throw Error('Invalid date');
 const old=await record(db,owner,'journal',data.date);const expected=Number(data.version||0);
 if(expected!==(old?.version||0))throw Error('CONFLICT');
 const item:any={id:data.date,date:data.date,version:expected+1,updated:new Date().toISOString()};
 for(const key of ['events','win','challenge','adjustment','priority','nextStep','learned','grateful','thoughts','goalProgress']){const text=String(data[key]||'');if(text.length>12000)throw Error('Entry is too long');item[key]=text}
 for(const key of ['mood','energy','stress','sleep']){const n=data[key]===''||data[key]==null?null:Number(data[key]);if(n!==null&&(!Number.isFinite(n)||n< (key==='sleep'?0:1)||n>(key==='sleep'?24:5)||key!=='sleep'&&!Number.isInteger(n)))throw Error('Invalid wellbeing value');item[key]=n}
 if(!['','mostly','partly','notToday','unsure'].includes(data.alignment||''))throw Error('Invalid reflection');item.alignment=data.alignment||'';
 for(const [field,kind] of [['areaIds','area'],['goalIds','goal'],['habitIds','habit']])item[field]=await validateLinks(db,owner,kind,data[field]||[]);
 const photoIds=await validateLinks(db,owner,'photo',data.photoIds||[]);
 for(const id of photoIds)if((await record(db,owner,'photo',id)).date!==data.date)throw Error('Photo belongs to another date');
 if(files.length+photoIds.length>MAX_PHOTOS||files.some(f=>!f.size||f.size>MAX_PHOTO_BYTES)||files.reduce((n,f)=>n+f.size,0)>MAX_TOTAL_BYTES)throw Error('PHOTO_LIMIT');
 if(files.length&&!bucket)throw Error('Photo storage is unavailable');
 const types=[];for(const file of files){const type=imageType(new Uint8Array(await file.slice(0,12).arrayBuffer()));if(file.type&&file.type!==type)throw Error('Invalid photo type');types.push(type)}
 const north=await record(db,owner,'northstar','main');item.northStarSnapshot=old?.northStarSnapshot??north?.statement??'';item.northStarAreaIds=old?.northStarAreaIds??north?.areaIds??[];
 const created:any[]=[];
 try{
 for(let i=0;i<files.length;i++){const id=crypto.randomUUID(),key='photos/'+owner+'/'+id;const metadata={id,date:item.date,name:files[i].name.slice(0,120),type:types[i],size:files[i].size};created.push({key,metadata});await bucket.put(key,await files[i].arrayBuffer(),{httpMetadata:{contentType:types[i]}})}
 item.photoIds=[...photoIds,...created.map(x=>x.metadata.id)];
 const json=JSON.stringify(item),key=owner+':journal:'+item.date;
 const first=old?db.prepare('UPDATE records SET payload=? WHERE id=? AND owner=? AND payload=?').bind(json,key,owner,JSON.stringify(old)):db.prepare('INSERT OR IGNORE INTO records(id,owner,kind,payload) VALUES(?,?,?,?)').bind(key,owner,'journal',json);
 const statements=[first,...created.map(x=>db.prepare('INSERT INTO records(id,owner,kind,payload) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND owner=? AND payload=?)').bind(owner+':photo:'+x.metadata.id,owner,'photo',JSON.stringify(x.metadata),key,owner,json))];
 const result=await db.batch(statements);if(!result[0].meta.changes)throw Error('CONFLICT');return item;
 }catch(e){for(const x of created){try{await bucket.delete(x.key)}catch{}}throw e}
}
export async function readPrivatePhoto(db:any,bucket:any,owner:string,id:string){
 if(!owner)return new Response('Sign in required',{status:401,headers:privateHeaders});
 if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404,headers:privateHeaders});
 const metadata=await record(db,owner,'photo',id);if(!metadata)return new Response('Not found',{status:404,headers:privateHeaders});
 const object=await bucket?.get('photos/'+owner+'/'+id);if(!object)return new Response('Not found',{status:404,headers:privateHeaders});
 return new Response(object.body,{headers:{...privateHeaders,'Content-Type':metadata.type,'Content-Disposition':'inline','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
