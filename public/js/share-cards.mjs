import {publicRating,httpUrl} from './ratings.mjs';
export function cardSize(format='square'){if(format==='square')return [1080,1080];if(format==='portrait')return [1080,1920];throw Error('Formato de tarjeta inválido.');}
export function buildWorkCard(state,id,{personal=false,progress=false,publicScore=false,today=new Date().toISOString().slice(0,10)}={}){
 const entry={...state.catalogOfficial,...state.catalogCustom}[id];if(!entry)throw Error('Ficha no disponible.');const track=state.tracking?.[id]||{},lines=[entry.mediaKind==='movie'?'Película':'Serie / temporada'];
 if(personal&&typeof track.rating==='number')lines.push(`Mi nota: ${track.rating} / 10`);
 if(progress&&track.status)lines.push(`Mi seguimiento: ${track.status}${entry.mediaKind!=='movie'&&Number.isInteger(track.seen)?` · ${track.seen} episodios registrados`:''}`);
 const r=publicScore?publicRating(state,id,today):null;if(r)lines.push(`${r.source}: ${r.score.toFixed(2)} / 10 (${r.value}/${r.scale}; ${r.votes} votos; ${r.checkedAt})`);
 const sources=[...(entry.sources||[]).map(s=>s.url),...(r?[r.url]:[])].map(httpUrl).filter(Boolean);
 return {kind:'work',title:String(entry.title||entry.name||'Sin título'),subtitle:'Mi radar audiovisual',lines,sources:[...new Set(sources)].slice(0,4),day:today};
}
function textLines(ctx,text,width){const lines=[];for(const paragraph of String(text).split('\n')){let current='';for(const word of paragraph.split(/\s+/)){const candidate=current?`${current} ${word}`:word;if(ctx.measureText(candidate).width<=width){current=candidate;continue;}if(current){lines.push(current);current='';}if(ctx.measureText(word).width<=width){current=word;continue;}for(const char of word){if(ctx.measureText(current+char).width>width){lines.push(current);current=char;}else current+=char;}}if(current)lines.push(current);}return lines;}
function block(ctx,text,{x,y,width,size=32,lineHeight=size*1.35,maxLines=5,color='#ede8fa',weight='normal'}){ctx.font=`${weight} ${size}px system-ui,sans-serif`;ctx.fillStyle=color;const lines=textLines(ctx,text,width);lines.slice(0,maxLines).forEach((line,i)=>{let value=line;if(i===maxLines-1&&lines.length>maxLines){while(ctx.measureText(value+'…').width>width)value=value.slice(0,-1);value+='…';}ctx.fillText(value,x,y+i*lineHeight);});return y+Math.min(lines.length,maxLines)*lineHeight;}
export function drawCard(canvas,model,{format='square'}={}){
 const [width,height]=cardSize(format);canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Tu navegador no permite crear la imagen.');ctx.fillStyle='#1d1536';ctx.fillRect(0,0,width,height);ctx.fillStyle='#8760d8';ctx.fillRect(0,0,24,height);ctx.fillStyle='#30224e';ctx.fillRect(58,58,width-116,height-116);
 if(format==='portrait'){ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle='#c9b3ff';ctx.lineWidth=4;for(const radius of [210,275,340]){ctx.beginPath();ctx.arc(540,1170,radius,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#c9b3ff';ctx.font='360px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('✦',540,1290);ctx.restore();}
 block(ctx,'RACOON',{x:92,y:130,width:750,size:48,weight:'bold',maxLines:1,color:'#d8c8ff'});block(ctx,'✦',{x:900,y:132,width:90,size:55,maxLines:1,color:'#d8c8ff'});
 let y=block(ctx,model.title,{x:92,y:245,width:880,size:64,lineHeight:78,maxLines:format==='portrait'?5:3,weight:'bold'});y=block(ctx,model.subtitle,{x:92,y:y+35,width:880,size:30,maxLines:2,color:'#c2b2de'})+35;
 const sourceStart=height-(model.sources?.length?210:125),available=sourceStart-y;
 const lines=model.lines||[];const size=lines.length>5?27:32;for(const line of lines){if(y+size*2>sourceStart)break;y=block(ctx,line,{x:92,y,width:880,size,lineHeight:size*1.4,maxLines:Math.min(3,Math.max(1,Math.floor((sourceStart-y)/(size*1.4))))})+18;}
 if(available<0)throw Error('Título demasiado largo para esta tarjeta.');
 if(model.sources?.length){block(ctx,'Fuentes (consulta la ficha para el detalle):',{x:92,y:sourceStart,width:880,size:19,maxLines:1,color:'#c2b2de'});model.sources.slice(0,4).forEach((source,i)=>block(ctx,source,{x:92,y:sourceStart+30+i*22,width:880,size:16,lineHeight:20,maxLines:1,color:'#c2b2de'}));}
 block(ctx,`Generada ${model.day} · Datos seleccionados por ti`,{x:92,y:height-85,width:880,size:21,maxLines:1,color:'#c2b2de'});return canvas;
}
export function canvasPng(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo exportar PNG.')),'image/png'));}
export async function deliverCard(blob,{navigator=globalThis.navigator,download,makeFile=(data)=>new File([data],'racoon-tarjeta.png',{type:'image/png'})}={}){
 const file=makeFile(blob);if(navigator?.share&&navigator?.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'RACOON'});return 'shared';}catch(error){if(error.name==='AbortError')return 'cancelled';throw Error('No se pudo compartir. Puedes descargar el PNG.');}}
 await download(blob);return 'downloaded';
}
