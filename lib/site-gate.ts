// Shared entry gate, independent of account authentication and per-user data ownership.
const COOKIE='__Host-life_entry',SESSION_SECONDS=12*60*60,WINDOW_MS=15*60*1000,MAX_ATTEMPTS=10;
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export const sha256=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const equal=(a:string,b:string)=>{let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0};
async function sign(secret:string,value:string){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))}
export async function makeSession(secret:string,now=Date.now()){const payload=Math.floor(now/1000)+SESSION_SECONDS+'.'+crypto.randomUUID();return payload+'.'+await sign(secret,payload)}
export async function validSession(token:string,secret:string,now=Date.now()){
 if(!/^\d{10}\.[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(token))return false;
 const [expiry,nonce,signature]=token.split('.'),time=now/1000;if(Number(expiry)<=time||Number(expiry)>time+SESSION_SECONDS+60)return false;
 return equal(signature,await sign(secret,expiry+'.'+nonce));
}
const copy={
 en:{title:'Private access',intro:'Enter the site password to open Life Tracking.',label:'Site password',button:'Unlock site',wrong:'Incorrect password. Please try again.',limited:'Too many attempts. Please try again in 15 minutes.',offline:'Access is temporarily unavailable. Please try again shortly.',note:'Your personal records still require your own account sign-in.'},
 ur:{title:'محفوظ داخلہ',intro:'لائف ٹریکنگ کھولنے کے لیے سائٹ کا پاس ورڈ درج کریں۔',label:'سائٹ کا پاس ورڈ',button:'سائٹ کھولیں',wrong:'پاس ورڈ درست نہیں۔ دوبارہ کوشش کریں۔',limited:'بہت زیادہ کوششیں ہو چکی ہیں۔ ۱۵ منٹ بعد دوبارہ کوشش کریں۔',offline:'داخلہ عارضی طور پر دستیاب نہیں۔ کچھ دیر بعد دوبارہ کوشش کریں۔',note:'اپنے ذاتی ریکارڈ کے لیے اپنے اکاؤنٹ سے سائن اِن بھی کرنا ہوگا۔'},
 ar:{title:'دخول خاص',intro:'أدخل كلمة مرور الموقع لفتح Life Tracking.',label:'كلمة مرور الموقع',button:'فتح الموقع',wrong:'كلمة المرور غير صحيحة. حاول مجددًا.',limited:'محاولات كثيرة. حاول مجددًا بعد 15 دقيقة.',offline:'الدخول غير متاح مؤقتًا. حاول بعد قليل.',note:'تظل سجلاتك الشخصية مرتبطة بتسجيل الدخول بحسابك.'}
};
function gatePage(language:string,error:'wrong'|'limited'|'offline'|''='',status=200){
 const lang=language==='en'||language==='ar'?language:'ur',v=copy[lang],rtl=lang!=='en';
 const html=`<!doctype html><html lang="${lang}" dir="${rtl?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${v.title} · Life Tracking</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f1f6f3;color:#173e31;font:16px/1.8 system-ui,Tahoma,sans-serif}main{width:min(100%,440px);padding:32px;background:white;border:1px solid #d8e5dd;border-radius:20px;box-shadow:0 16px 55px #163b3010}.brand{font-weight:700;font-size:18px;color:#29664e}.icon{width:56px;height:56px;border:1px solid #c4dacb;border-radius:15px;display:grid;place-items:center;background:#e8f3ec;margin:24px 0}h1{font-size:28px;line-height:1.5;margin:12px 0}p{color:#536b5e;margin:12px 0}label{display:block;font-size:15px;font-weight:600;margin-top:24px}input,button{font:inherit;border-radius:9px;min-height:50px;width:100%;margin-top:8px}input{border:1px solid #a4beae;padding:10px 13px}input:focus{outline:2px solid #286e51;outline-offset:2px}button{background:#195b43;color:white;border:0;padding:11px;cursor:pointer;margin-top:20px;font-weight:600}button:hover{background:#104631}button:focus-visible,a:focus-visible{outline:3px solid #a28235;outline-offset:4px}.note{font-size:13px;margin-top:20px}.error{background:#fff0eb;color:#8c3424;border-radius:9px;padding:12px;font-size:14px}nav{display:flex;gap:18px;justify-content:center;margin-top:26px;font-size:14px}a{color:#2d6650;text-decoration:none}a[aria-current=page]{font-weight:bold;text-decoration:underline}@media(max-width:480px){body{padding:16px}main{padding:26px 22px}}</style></head><body><main><div class="brand">Life Tracking</div><div class="icon"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg></div><h1>${v.title}</h1><p>${v.intro}</p>${error?`<p class="error" role="alert">${v[error]}</p>`:''}<form method="post" action="/site-entry?lang=${lang}"><label for="password">${v.label}</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="128" required autofocus><button>${v.button}</button></form><p class="note">${v.note}</p><nav aria-label="Language"><a href="/?lang=en" ${lang==='en'?'aria-current="page"':''}>English</a><a href="/?lang=ur" ${lang==='ur'?'aria-current="page"':''}>اردو</a><a href="/?lang=ar" ${lang==='ar'?'aria-current="page"':''}>العربية</a></nav></main></body></html>`;
 return new Response(html,{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",...(status===429?{'Retry-After':'900'}:{})}});
}
async function limitedText(request:Request){const reader=request.body?.getReader();if(!reader)return '';const parts:Uint8Array[]=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw Error('Too large')}parts.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}return new TextDecoder().decode(bytes)}
async function consumeAttempt(db:any,ip:string,now:number){
 const owner='__site_entry_gate__',window=Math.floor(now/WINDOW_MS),id='entry-limit:'+await sha256(ip)+':'+window;
 await db.prepare("DELETE FROM records WHERE owner=? AND kind='entry_limit' AND json_extract(payload,'$.expires') < ?").bind(owner,now).run();
 const row=await db.prepare("INSERT INTO records(id,owner,kind,payload) VALUES(?,?,'entry_limit',?) ON CONFLICT(id) DO UPDATE SET payload=json_set(records.payload,'$.attempts',json_extract(records.payload,'$.attempts')+1) RETURNING payload").bind(id,owner,JSON.stringify({attempts:1,expires:(window+1)*WINDOW_MS})).first();
 return JSON.parse(row.payload).attempts<=MAX_ATTEMPTS;
}
export async function siteGate(request:Request,env:any,now=Date.now()):Promise<Response|null>{
 const url=new URL(request.url),lang=url.searchParams.get('lang')||'ur';
 // The existing ChatGPT tool endpoint retains its authenticated, account-scoped access.
 // It never serves the browser dashboard or bypasses the browser entry gate.
 if(url.pathname==='/mcp')return null;
 const secret=env.SITE_ENTRY_COOKIE_SECRET,hash=env.SITE_ENTRY_PASSWORD_HASH;
 if(typeof secret!=='string'||secret.length<32||typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))return gatePage(lang,'offline',503);
 const cookie=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
 if(url.pathname==='/site-entry/logout'&&request.method==='POST'){
 if(request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403,headers});
 return new Response(null,{status:303,headers:{...headers,Location:'/', 'Set-Cookie':`${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`}});
 }
 if(await validSession(cookie,secret,now))return null;
 if(url.pathname==='/site-entry'&&request.method==='POST'){
 if(request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403,headers});
 try{
 if(!await consumeAttempt(env.DB,request.headers.get('CF-Connecting-IP')||'unknown',now))return gatePage(lang,'limited',429);
 const form=new URLSearchParams(await limitedText(request)),password=form.get('password')||'';
 if(password.length>128||!equal(await sha256(password),hash))return gatePage(lang,'wrong',401);
 return new Response(null,{status:303,headers:{...headers,Location:'/', 'Set-Cookie':`${COOKIE}=${await makeSession(secret,now)}; Path=/; Max-Age=${SESSION_SECONDS}; Secure; HttpOnly; SameSite=Lax`}});
 }catch{return gatePage(lang,'offline',503)}
 }
 if(url.pathname.startsWith('/api/')||!['GET','HEAD'].includes(request.method))return Response.json({error:'Site password required'},{status:401,headers});
 const response=gatePage(lang);return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response;
}
