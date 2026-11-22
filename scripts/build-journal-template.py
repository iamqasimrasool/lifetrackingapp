"""Build the editable print master and portable XML parts used by Word downloads."""
import json,zipfile,io,os
from pathlib import Path
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT
from lxml import etree
root=Path(__file__).resolve().parents[1]
copy=json.loads((root/'lib/print-copy.json').read_text())
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for lang,labels in copy.items():
 d=Document();sec=d.sections[0];sec.page_width=Inches(8.5);sec.page_height=Inches(11);sec.top_margin=sec.bottom_margin=Inches(.45);sec.left_margin=sec.right_margin=Inches(.5)
 normal=d.styles['Normal'];normal.font.name='Arial';normal.font.size=Pt(10);normal.font.color.rgb=RGBColor(0,0,0);normal.paragraph_format.space_after=Pt(0);normal.paragraph_format.line_spacing=1.08
 for style in ['Title','Heading 1','Heading 2']:
  d.styles[style].font.color.rgb=RGBColor(0,0,0)
  for border in list(d.styles[style].element.findall('.//'+qn('w:pBdr'))):border.getparent().remove(border)
  d.styles[style].font.name='Georgia' if style=='Title' else 'Arial'
 rtl=lang!='en'
 def p(parent,text='',size=10,bold=False,space=0,ruled=False):
  x=parent.add_paragraph() if hasattr(parent,'add_paragraph') else None;x.paragraph_format.space_after=Pt(space);x.paragraph_format.keep_with_next=False
  if rtl:
   bi=OxmlElement('w:bidi');x._p.get_or_add_pPr().append(bi);jc=OxmlElement('w:jc');jc.set(qn('w:val'),'start');x._p.get_or_add_pPr().append(jc)
  run=x.add_run(text);run.font.size=Pt(size);run.bold=bold
  cs=OxmlElement('w:szCs');cs.set(qn('w:val'),str(size*2));run._r.get_or_add_rPr().append(cs)
  if bold:run._r.get_or_add_rPr().append(OxmlElement('w:bCs'))
  if rtl:r=OxmlElement('w:rtl');run._r.get_or_add_rPr().append(r)
  if ruled:
   x.paragraph_format.line_spacing=Pt(18);b=OxmlElement('w:pBdr');bottom=OxmlElement('w:bottom');bottom.set(qn('w:val'),'single');bottom.set(qn('w:sz'),'3');bottom.set(qn('w:color'),'D9D9D9');b.append(bottom);between=OxmlElement('w:between');between.set(qn('w:val'),'single');between.set(qn('w:sz'),'3');between.set(qn('w:color'),'D9D9D9');b.append(between);x._p.get_or_add_pPr().append(b)
  return x
 def gap(parent=d,points=5):
  x=p(parent,'',size=1);x.paragraph_format.line_spacing=Pt(points);x.paragraph_format.space_after=Pt(0)
 def table(parent,cols,widths):
  t=parent.add_table(rows=1,cols=cols);t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
  for c,w in zip(t.columns,widths):c.width=Inches(w)
  pr=t._tbl.tblPr;borders=OxmlElement('w:tblBorders')
  for side in ['top','left','bottom','right','insideH','insideV']:
   el=OxmlElement('w:'+side);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');borders.append(el)
  pr.append(borders);m=OxmlElement('w:tblCellMar')
  for k,v in [('top',100),('bottom',100),('left',140),('right',140)]:
   x=OxmlElement('w:'+k);x.set(qn('w:w'),str(v));x.set(qn('w:type'),'dxa');m.append(x)
  pr.append(m)
  if rtl:pr.append(OxmlElement('w:bidiVisual'))
  for c in t.rows[0].cells:c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.TOP
  return t
 def box(cell,title,key,lines):
  cell.text='';p(cell,title.upper() if lang=='en' else title,10,True,space=4);p(cell,'{{'+key+'}}',10,ruled=True)
  for _ in range(lines-1):p(cell,' ',ruled=True)
 def title(second=False):
  x=p(d,labels['reflectTitle' if second else 'title'],24,True,space=1);x.style=d.styles['Title'];x.paragraph_format.space_after=Pt(2);x.paragraph_format.page_break_before=second
  p(d,labels['reflectSub' if second else 'subtitle'],10,space=4)
  p(d,labels['date']+'  {{date}}     '+labels['day']+'  {{day}}',10,space=8)
 title()
 t=table(d,1,[7.5]);c=t.cell(0,0);box(c,labels['north'],'north',1);p(c,labels['areas']+'  {{areas}}',9,space=2);p(c,labels['goals']+'  {{goals}}',9)
 gap()
 t=table(d,2,[4.3,3.2]);box(t.cell(0,0),labels['priorities'],'topPriorities',3);c=t.cell(0,1);c.text='';p(c,labels['wellbeing'].upper() if lang=='en' else labels['wellbeing'],10,True,space=5)
 for key in ['mood','energy','stress']:p(c,labels[key]+'   {{'+key+'}}   1   2   3   4   5',10,space=4)
 p(c,labels['sleep']+'   {{sleep}}  ______',10);p(c,labels['scale'],8)
 gap()
 t=table(d,2,[2.65,4.85]);left,right=t.rows[0].cells
 left.text='';p(left,labels['quick'].upper() if lang=='en' else labels['quick'],10,True,space=4);p(left,'{{quickTasks}}',ruled=True)
 for _ in range(3):p(left,'☐',ruled=True)
 gap(left,8);p(left,labels['brain'].upper() if lang=='en' else labels['brain'],10,True,space=4)
 for _ in range(9):p(left,' ',ruled=True)
 right.text='';p(right,labels['time'].upper() if lang=='en' else labels['time'],10,True,space=4)
 tt=right.add_table(rows=0,cols=2);tt.autofit=False;tt.columns[0].width=Inches(.62);tt.columns[1].width=Inches(3.9)
 for hr in range(6,24):
  row=tt.add_row();row.height=Inches(.18)
  for cell in row.cells:
   cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
   for side in ['bottom']:
    b=OxmlElement('w:tcBorders');el=OxmlElement('w:'+side);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'3');el.set(qn('w:color'),'D9D9D9');b.append(el);cell._tc.get_or_add_tcPr().append(b)
  row.cells[0].text=f'{hr:02}:00';row.cells[1].text='{{time'+f'{hr:02}'+'}}'
  for cell in row.cells:
   for para in cell.paragraphs:
    para.paragraph_format.space_after=Pt(0)
    for run in para.runs:run.font.size=Pt(9)
 p(right,'{{extraTime}}',9)
 gap();p(d,labels['habits'].upper() if lang=='en' else labels['habits'],11,True,space=3);p(d,'{{HABIT_TABLE}}',size=1);p(d,labels['habitHelp'],8)
 title(True)
 t=table(d,1,[7.5]);box(t.cell(0,0),labels['events'],'events',5);gap()
 for a,b in [('progress','win'),('challenge','adjustment'),('learned','grateful'),('tomorrow','next')]:
  t=table(d,2,[3.75,3.75]);keys={'progress':'goalProgress','tomorrow':'priority','next':'nextStep'};box(t.cell(0,0),labels[a],keys.get(a,a),3);box(t.cell(0,1),labels[b],keys.get(b,b),3);gap()
 p(d,labels['alignment'],10,True,space=3);p(d,'{{alignment}}',10);p(d,labels['alignmentChoices'],9,space=7)
 t=table(d,2,[4.6,2.9]);box(t.cell(0,0),labels['thoughts'],'thoughts',4);c=t.cell(0,1);box(c,labels['photos'],'photoCount',3)
 # Remove empty leading cell paragraphs to avoid wasting writing space.
 for t in d.tables:
  for row in t.rows:
   for cell in row.cells:
    if len(cell.paragraphs)>1 and not cell.paragraphs[0].text:cell.paragraphs[0]._element.getparent().remove(cell.paragraphs[0]._element)
 stream=io.BytesIO();d.save(stream)
 with zipfile.ZipFile(stream) as z:
  wanted=['[Content_Types].xml','_rels/.rels','word/document.xml','word/styles.xml','word/settings.xml','word/_rels/document.xml.rels']
  parts={name:z.read(name).decode() for name in wanted}
  # Retain only styles used by the form; set explicit typefaces, avoid unused theme assets.
  styles=etree.fromstring(parts['word/styles.xml'].encode())
  keep={'Normal','Title','Heading1','Heading2','DefaultParagraphFont','TableNormal','NoList','TableGrid'}
  for style in list(styles.findall('w:style',NS)):
   if style.get(qn('w:styleId')) not in keep:styles.remove(style)
  parts['word/styles.xml']=etree.tostring(styles,encoding='unicode')
  parts['word/_rels/document.xml.rels']='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'
  parts['_rels/.rels']='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  parts['[Content_Types].xml']='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'
  (root/f'lib/journal-template-{lang}.json').write_text(json.dumps(parts,ensure_ascii=False,separators=(',',':')))
print('Built English, Urdu and Arabic Word masters')
