import en from './journal-template-en.json';
import ur from './journal-template-ur.json';
import ar from './journal-template-ar.json';
import type {JournalPrintModel} from './journal-print-model';
const xml=(value:string)=>value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const text=(value:string)=>xml(value).replace(/\r?\n/g,'</w:t><w:br/><w:t xml:space="preserve">');
const cell=(value:string,width:number,head=false)=>`<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:fill="${head?'E9E9E9':'FFFFFF'}"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="18"/>${head?'<w:b/>':''}</w:rPr><w:t xml:space="preserve">${text(value)}</w:t></w:r></w:p></w:tc>`;
function habitTable(m:JournalPrintModel){const labels=m.labels,widths=[3100,1700,1700,1600,2700];const names=[labels.habit,labels.target,labels.actual,labels.result,labels.goal];const rows=[...m.habitRows];while(rows.length<(m.blank||!m.entryExists?5:0))rows.push({id:'',name:'',target:'',actual:'',status:'',goals:''});
 return `<w:tbl><w:tblPr><w:tblW w:w="10800" w:type="dxa"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="single" w:sz="4" w:color="D9D9D9"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="75" w:type="dxa"/><w:bottom w:w="75" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>${m.lang==='en'?'':'<w:bidiVisual/>'}</w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:tblHeader/></w:trPr>${names.map((n,i)=>cell(n,widths[i],true)).join('')}</w:tr>${rows.map(r=>`<w:tr><w:trPr><w:trHeight w:val="330" w:hRule="atLeast"/></w:trPr>${[r.name,r.target,r.actual,r.status,r.goals].map((v,i)=>cell(v,widths[i])).join('')}</w:tr>`).join('')}</w:tbl>`;
}
// ZIP store format keeps the download portable across Workers, Word and LibreOffice.
export function zipParts(parts:Record<string,string>){const encoder=new TextEncoder(),local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;const crc=(bytes:Uint8Array)=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
 const header=(n:number)=>{const bytes=new Uint8Array(n);return {bytes,v:new DataView(bytes.buffer)}};
 for(const [name,content] of Object.entries(parts)){const n=encoder.encode(name),body=encoder.encode(content),checksum=crc(body),h=header(30);h.v.setUint32(0,0x04034b50,true);h.v.setUint16(4,20,true);h.v.setUint32(14,checksum,true);h.v.setUint32(18,body.length,true);h.v.setUint32(22,body.length,true);h.v.setUint16(26,n.length,true);local.push(h.bytes,n,body);const c=header(46);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint32(16,checksum,true);c.v.setUint32(20,body.length,true);c.v.setUint32(24,body.length,true);c.v.setUint16(28,n.length,true);c.v.setUint32(42,offset,true);central.push(c.bytes,n);offset+=h.bytes.length+n.length+body.length;}
 const centralSize=central.reduce((n,a)=>n+a.length,0),end=header(22),count=Object.keys(parts).length;end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,count,true);end.v.setUint16(10,count,true);end.v.setUint32(12,centralSize,true);end.v.setUint32(16,offset,true);const output=new Uint8Array(offset+centralSize+22);let cursor=0;for(const piece of [...local,...central,end.bytes]){output.set(piece,cursor);cursor+=piece.length}return output;
}
export function journalDocx(m:JournalPrintModel){const parts:Record<string,string>={...({en,ur,ar}[m.lang])};let document=parts['word/document.xml'];
 document=document.replace(/<w:p\b[^>]*>(?:(?!<w:p\b)[\s\S])*?\{\{HABIT_TABLE\}\}(?:(?!<w:p\b)[\s\S])*?<\/w:p>/,habitTable(m));
 document=document.replace(/\{\{(\w+)\}\}/g,(_,key)=>text(m.data[key]||(['date','day'].includes(key)?'________________':'')));
 parts['word/document.xml']=document;return zipParts(parts);
}
