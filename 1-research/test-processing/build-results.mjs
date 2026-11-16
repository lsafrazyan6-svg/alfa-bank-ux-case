import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=path.dirname(fileURLToPath(import.meta.url));
const guide=JSON.parse(await fs.readFile(path.join(root,'guide-questions.json'),'utf8'));
const participants=[];
for(let n=1;n<=3;n++)participants.push(JSON.parse(await fs.readFile(path.join(root,`participant-${n}-draft.json`),'utf8')));
const rows=[['Вопросы из гайда','Участник 1 — имя уточняется','Участник 2 — имя уточняется','Участник 3 — имя уточняется','Участник 4 — ожидается интервью с исследовательницей','Участник 5 — ожидается интервью с исследовательницей'],
['Статус обработки',...participants.map(p=>p.verification),'Нет записи; ответы будут добавлены со слов исследовательницы.','Нет записи; ответы будут добавлены со слов исследовательницы.'],
['Источник',...participants.map(p=>p.source),'Пока не получен','Пока не получен']];
let previous='';const sectionRows=[];
for(let i=0;i<guide.length;i++){
 const section=guide[i].section.startsWith('Часть 1')?'Часть 1. Найти раздел кэшбэка и выбрать предложение':guide[i].section.startsWith('Часть 2')?'Часть 2. Задания и награды':guide[i].section;
 if(section!==previous){sectionRows.push(rows.length+1);rows.push([section,'','','','','']);previous=section;}
 let label=guide[i].question;
 if(guide[i].stimulus)label+='\nСообщение: '+guide[i].stimulus;
 rows.push([label,...participants.map(p=>p.cells[i]),'Нет данных — вопрос ещё не обсуждали','Нет данных — вопрос ещё не обсуждали']);
}
sectionRows.push(rows.length+1);rows.push(['Уточнения, которых нет отдельными строками в гайде','','','','','']);
rows.push(['Заметность раздела или баннера: контекст для решения исследовательницы',...participants.map(p=>p.notice||'Нет отдельного вопроса «заметили ли сразу». Не кодировать заметность по показу баннера модератором.'),'Нет данных','Нет данных']);
rows.push(['Где искать награду после выполнения?',...participants.map(p=>p.reward||'Отдельный вопрос не задан.'),'Нет данных','Нет данных']);

const wb=Workbook.create(),s=wb.worksheets.add('Ответы участников');
s.showGridLines=true;
s.getRange(`A1:F${rows.length}`).values=rows;
s.getRange(`A1:F${rows.length}`).format={font:{name:'Arial',size:11,color:'#202124'},wrapText:true,verticalAlignment:'top'};
s.getRange(`A1:A${rows.length}`).format.columnWidthPx=390;
s.getRange(`B1:F${rows.length}`).format.columnWidthPx=460;
s.getRange('A1:F1').format={fill:'#E8EAED',font:{bold:true},rowHeightPx:55,verticalAlignment:'center'};
s.getRange('A2:F2').format.rowHeightPx=130;
s.getRange('A3:F3').format.rowHeightPx=55;
for(let n=4;n<=rows.length;n++){
 if(sectionRows.includes(n)){s.getRange(`A${n}:F${n}`).format={fill:'#F1F3F4',font:{bold:true},rowHeightPx:48};continue;}
 const maxLines=Math.max(...rows[n-1].map((x,j)=>String(x).split('\n').reduce((a,line)=>a+Math.max(1,Math.ceil(line.length/(j?57:48))),0)));
 s.getRange(`A${n}:F${n}`).format.rowHeightPx=Math.max(62,maxLines*18+22);
}
s.freezePanes.freezeRows(1);s.freezePanes.freezeColumns(1);
wb.recalculate();
await fs.writeFile(path.join(root,'results-matrix.json'),JSON.stringify(rows,null,2));
const check=await wb.inspect({kind:'table',range:'\'Ответы участников\'!A1:C6',include:'values',tableMaxRows:6,tableMaxCols:3,maxChars:1500});console.log(check.ndjson);
const outDir=path.join(root,'outputs');await fs.mkdir(outDir,{recursive:true});
const image=await wb.render({sheetName:s.name,range:'A1:C9',scale:1,format:'png'});
await fs.writeFile(path.join(outDir,'results-preview.png'),new Uint8Array(await image.arrayBuffer()));
await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(outDir,'alfa-usability-tests.xlsx'));
console.log('Exported',rows.length,'rows');
