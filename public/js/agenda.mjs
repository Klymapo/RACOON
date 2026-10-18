import {buildCalendarModel} from './schedule.mjs';
const plus=(date,n)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
function valid(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
export function agendaRange(mode='week',anchor=new Date().toISOString().slice(0,10)){
 if(!valid(anchor))throw Error('Fecha de agenda inválida.');if(!['day','week','month'].includes(mode))mode='week';
 let start=anchor,length=1;const d=new Date(`${anchor}T12:00:00Z`);
 if(mode==='week'){start=plus(anchor,-((d.getUTCDay()+6)%7));length=7;}
 if(mode==='month'){start=anchor.slice(0,7)+'-01';length=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();}
 return {mode,start,days:Array.from({length},(_,i)=>plus(start,i))};
}
export function shiftAgendaDate(anchor,mode,direction){
 if(!valid(anchor)||![-1,1].includes(direction))throw Error('Navegación de agenda inválida.');
 if(mode!=='month')return plus(anchor,direction*(mode==='day'?1:7));
 const d=new Date(`${anchor}T12:00:00Z`),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+direction);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
}
export function ownCatalogIds(state){
 const ids=new Set([...Object.keys(state.tracking||{}),...Object.keys(state.catalogCustom||{})]);
 for(const entry of Object.values(state.catalogOfficial||{}))if(entry.savedAt)ids.add(entry.id);
 const works=new Set([...ids].map(id=>state.mediaLibrary?.catalogLinks?.[id]?.workId).filter(Boolean));
 for(const [id,memberships]of Object.entries(state.collections?.memberships||{}))if(Object.entries(memberships).some(([folder,v])=>v.assigned&&state.collections.folders[folder]?.trashedAt==null))works.add(id);
 for(const [id,link]of Object.entries(state.mediaLibrary?.catalogLinks||{}))if(works.has(link.workId))ids.add(id);
 return ids;
}
export function buildAgendaModel(catalog,state,options={}){
 const range=agendaRange(options.mode,options.anchor),scope=options.scope==='all'?'all':'mine',mine=ownCatalogIds(state);
 const entries=scope==='all'?catalog:catalog.filter(entry=>mine.has(entry.id));
 const days=range.days.map(date=>({date,entries:[]}));
 for(let index=0;index<days.length;index+=7){
  const week=buildCalendarModel(entries,state,{weekStart:days[index].date,platform:options.platform,status:options.status});
  for(const day of week.days){const target=days.find(d=>d.date===day.date);if(target)target.entries=day.entries;}
 }
 return {...range,scope,days,selectedDay:range.days.includes(options.selectedDay)?options.selectedDay:range.start};
}
