import {searchTmdbWorks,getTmdbProviders} from './regional-auto.mjs';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderAutomaticRegionalPanel(entry) {
  return '<details class="region-auto-panel"><summary>Consultar plataformas por país (TMDB · gratuito opcional)</summary>'+
  '<p class="muted">Datos indicativos por país, no verificación de temporada, episodio ni canal. Requiere token de lectura TMDB propio (gratuito para uso no comercial), usado solo en esta consulta y nunca guardado.</p>'+
  '<label>Token TMDB (solo esta sesión)<input id="regionAutoToken" type="password" autocomplete="off" placeholder="Token de lectura TMDB" aria-label="Token TMDB"></label>'+
  '<button class="button button-soft" type="button" data-region-auto-search="'+escapeHtml(entry.id)+'">Buscar candidatos</button>'+
  '<div data-region-auto-results role="status" aria-live="polite"></div>'+
  '<p class="muted">Fuente: <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">TMDB</a> / <a href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer">JustWatch</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p></details>';
}
export function mountAutomaticRegionalLookup({document,getState,fetch=globalThis.fetch,now=Date.now}) {
  let generation=0,controller=null,candidates=[],offerRows=[],selected=null;
  const show=(html)=>{
    const target=document.querySelector('#workDetail [data-region-auto-results]');
    if(target)target.innerHTML=html;
  };
  function fresh() {generation++;controller?.abort();controller=new AbortController();return {id:generation,signal:controller.signal};}
  const current=(id,country)=>getState()?.regionData?.country===country && !!document.querySelector('[data-region-auto-search="'+id+'"]');
  document.addEventListener('click',async event=>{
    const search=event.target.closest?.('[data-region-auto-search]');
    const choose=event.target.closest?.('[data-region-auto-choice]');
    const copy=event.target.closest?.('[data-region-auto-copy]');
    if(!search&&!choose&&!copy)return;
    const button=search||choose||copy,id=(search?.dataset.regionAutoSearch||document.querySelector('[data-region-auto-search]')?.dataset.regionAutoSearch);
    if(!id)return;
    if(copy){
      const offer=offerRows[Number(copy.dataset.regionAutoCopy)],form=document.getElementById('regionalOfferForm');
      if(!offer||!form)return;
      form.closest('details').open=true;
      form.elements.country.value=offer.country;form.elements.platform.value=offer.provider;
      form.elements.channel.value='';form.elements.mode.value=offer.mode;form.elements.scope.value='title';
      form.elements.sourceUrl.value=offer.sourceUrl;form.elements.checkedAt.value=new Date(now()).toISOString().slice(0,10);
      form.elements.verified.checked=false;
      document.getElementById('regionalOfferStatus').textContent='Borrador sin verificar: confirma plan, canal y cobertura antes de guardar.';
      form.elements.platform.focus();return;
    }
    const token=document.getElementById('regionAutoToken')?.value||'';
    const item=getState().catalogOfficial?.[id]||getState().catalogCustom?.[id];
    if(!item)return;
    const country=getState().regionData?.country||'MX',kind=item.mediaKind==='movie'?'movie':'tv';
    const task=fresh();button.disabled=true;
    show('<p>Consultando TMDB; confirma la identidad antes de ver ofertas…</p>');
    try {
      if(search){
        candidates=await searchTmdbWorks(item.title||item.name,kind,token,{fetch,signal:task.signal});
        if(task.id!==generation||!current(id,country))return;
        show('<p>Selecciona manualmente la obra correcta (ninguna coincidencia se acepta automáticamente):</p>'+
          (candidates.map((v,i)=>'<button class="mini-button" type="button" data-region-auto-choice="'+i+'">'+escapeHtml(v.title)+' ('+escapeHtml(v.year||'s/f')+')</button>').join('')||'<p>Sin candidatos; conserva evidencia manual.</p>'));
      } else {
        selected=candidates[Number(choose.dataset.regionAutoChoice)];
        if(!selected)return;
        const result=await getTmdbProviders(selected.id,kind,country,token,{fetch,signal:task.signal});
        if(task.id!==generation||!current(id,country))return;
        offerRows=result.offers;
        show('<p><strong>Resultados indicativos para '+escapeHtml(selected.title)+' · '+escapeHtml(country)+'</strong> · Fuente TMDB/JustWatch. No se confirma cobertura ni que forme parte del plan base.</p>'+
          (offerRows.map((o,i)=>'<div class="folder-row"><strong>'+escapeHtml(o.provider)+'</strong> · '+escapeHtml(o.label)+
          ' · <a href="'+escapeHtml(o.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Ver fuente y cobertura ↗</a>'+
          ' <button class="mini-button" type="button" data-region-auto-copy="'+i+'">Copiar como borrador no verificado</button></div>').join('')||'<p>TMDB no reporta ofertas para ese país; esto NO demuestra indisponibilidad.</p>'));
      }
    }catch(err){if(task.id===generation)show('<p role="alert">'+escapeHtml(err.name==='AbortError'?'Consulta cancelada':err.message||'Falló la consulta')+'</p>');}
    finally {button.disabled=false;}
  });
  return {invalidate:()=>fresh()};
}
