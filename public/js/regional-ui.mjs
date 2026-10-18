import {OFFER_MODES,normalizeRegionData,offersForEntry,setRegionCountry,saveSubscription,saveRegionalOffer,retractRegionalOffer} from './regional.mjs';
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderRegionalResults(state,id,today){
 const data=normalizeRegionData(state.regionData),offers=offersForEntry(state,id,today);
 const labels={current:'Verificado por ti',stale:'Verificación antigua (más de 30 días)',expired:'Oferta caducada',unverified:'Sin verificar'};
 const rows=offers.map(o=>`<article class="folder-row"><strong>${html(o.platform)}${o.channel?' · '+html(o.channel):''}</strong><p>${html(OFFER_MODES[o.mode])} · ${html(o.country)} · ${o.scope==='title'?'Obra completa':o.scope==='season'?`Temporada ${o.season??'de esta ficha'}`:`Episodio ${o.episode}${o.season?' · temporada '+o.season:''}`}</p><p>${html(labels[o.verification])}${o.checkedAt?' · '+html(o.checkedAt):''}</p><p>${o.included===null?'Inclusión con tus suscripciones sin verificar':o.included?'Incluido con tus suscripciones, solo para la cobertura indicada':['free','ads'].includes(o.mode)?'Acceso gratuito según la fuente':['rent','buy'].includes(o.mode)?'Pago por separado':'Requiere otra suscripción'}</p>${o.sourceUrl?`<a href="${html(o.sourceUrl)}" target="_blank" rel="noopener noreferrer">Fuente registrada ↗</a>`:''}<div class="button-row"><button class="mini-button" type="button" data-region-edit="${html(o.id)}">Editar oferta</button><button class="mini-button" type="button" data-region-retract="${html(o.id)}">Marcar retirada</button></div></article>`).join('');
 const inactive=Object.values(data.offers).filter(o=>o.catalogId===id&&!o.active);
 return `<h3>Disponibilidad documentada · ${html(data.country)}</h3><p class="muted">Datos registrados por ti, no comprobación automática. La antigüedad indica cuándo conviene revisar; no confirma que una oferta haya desaparecido. Un dato de otro país no se traslada a este.</p>${rows||'<p>Sin ofertas documentadas para este país.</p>'}${inactive.map(o=>`<p>${html(o.platform)} · ${html(o.country)} · retirada <button class="mini-button" type="button" data-region-restore="${html(o.id)}">Restaurar registro</button></p>`).join('')}`;
}
export function renderRegionalPanel(state,entry,today){
 const country=normalizeRegionData(state.regionData).country;
 return `<section class="detail-section" data-regional-panel><div data-regional-results>${renderRegionalResults(state,entry.id,today)}</div><details><summary>Registrar o actualizar una oferta</summary><form id="regionalOfferForm" data-catalog-id="${html(entry.id)}"><input name="offerId" type="hidden"><div class="form-grid"><label>País (MX, US, ES…)<input name="country" maxlength="2" value="${country}" required></label><label>Servicio concreto<input name="platform" maxlength="120" required placeholder="Prime Video, Apple TV+, Apple TV Store…"></label><label>Canal / paquete adicional<input name="channel" maxlength="120" placeholder="Universal+; vacío si es base"></label><label>Modalidad<select name="mode">${Object.entries(OFFER_MODES).map(([key,label])=>`<option value="${key}">${html(label)}</option>`).join('')}</select></label><label>Cobertura<select name="scope"><option value="title">Obra completa</option><option value="season"${entry.mediaKind!=='movie'?' selected':''}>Solo una temporada</option><option value="episode">Solo un episodio</option></select></label><label>Temporada (si se conoce)<input name="season" type="number" min="1" step="1"></label><label>Episodio (obligatorio si aplica)<input name="episode" type="number" min="1" step="1"></label><label>Fuente pública<input name="sourceUrl" type="url" placeholder="https://…"></label><label>Fecha de revisión<input name="checkedAt" type="date"></label><label>Caduca (si se conoce)<input name="expiresAt" type="date"></label></div><label><input name="verified" type="checkbox"> Revisé la fuente para este país, modalidad y cobertura.</label><p class="muted">Prime Video base no incluye automáticamente Channels. Apple TV+ no equivale a Apple TV Store. Registrar una plataforma no confirma disponibilidad.</p><button class="button button-soft" type="submit">Guardar oferta</button><button class="button button-soft" type="reset">Limpiar</button><p id="regionalOfferStatus" role="status"></p></form></details></section>`;
}
export function renderRegionalSettings(document,state){
 const target=document.getElementById('regionalSubscriptions');if(!target)return;
 const d=normalizeRegionData(state.regionData);
 target.innerHTML=Object.values(d.subscriptions).map(s=>`<label class="folder-row"><span>${html(s.platform)}${s.channel?' · '+html(s.channel):' · base'} · ${html(s.country)}</span><span><input type="checkbox" data-subscription-id="${html(s.id)}"${s.active?' checked':''}> Activa</span></label>`).join('')||'<p class="muted">No has indicado suscripciones.</p>';
 if(document.activeElement!==document.getElementById('regionCountry'))document.getElementById('regionCountry').value=d.country;
}
export function mountRegionalControls({document,getState,commitState,now=Date.now}){
 const view=document?.getElementById?.('backupsView');if(!view||!document.createElement)return;
 const panel=document.createElement('article');panel.className='panel-card';panel.innerHTML='<h3>País y mis suscripciones</h3><form id="regionCountryForm"><label>País (código de dos letras)<input id="regionCountry" maxlength="2" required></label><button class="button button-soft" type="submit">Guardar país</button></form><p class="muted">No se solicitan cuentas ni contraseñas de streaming. Cada suscripción se registra para el país seleccionado.</p><form id="regionalSubscriptionForm"><div class="form-grid"><label>Servicio concreto<input name="platform" maxlength="120" required></label><label>Canal adicional (opcional)<input name="channel" maxlength="120"></label></div><button class="button button-soft" type="submit">Añadir suscripción activa</button></form><div id="regionalSubscriptions"></div><p id="regionSettingsStatus" role="status"></p>';
 view.appendChild(panel);
 const commit=(candidate,target,message)=>{const saved=commitState(candidate);document.getElementById(target).textContent=saved?message:'Cambio solo en memoria; exporta un JSON antes de cerrar.';};
 document.addEventListener('submit',event=>{
  const form=event.target;if(!['regionCountryForm','regionalSubscriptionForm','regionalOfferForm'].includes(form.id))return;event.preventDefault();
  const status=form.id==='regionalOfferForm'?'regionalOfferStatus':'regionSettingsStatus';
  try{
   if(form.id==='regionCountryForm')commit(setRegionCountry(getState(),document.getElementById('regionCountry').value,now()),status,'País guardado. Las ofertas de otros países no se mezclan.');
   if(form.id==='regionalSubscriptionForm'){const data=Object.fromEntries(new FormData(form));commit(saveSubscription(getState(),null,{...data,active:true},now()),status,'Suscripción guardada para este país.');form.reset();}
   if(form.id==='regionalOfferForm'){
    const data=Object.fromEntries(new FormData(form));data.catalogId=form.dataset.catalogId;data.verified=form.elements.verified.checked;
    for(const key of ['season','episode'])data[key]=data[key]===''?null:Number(data[key]);
    commit(saveRegionalOffer(getState(),data.offerId||null,data,now()),status,'Oferta guardada con su país, modalidad y fuente.');
   }
  }catch(error){document.getElementById(status).textContent=error.message;}
 });
 document.addEventListener('change',event=>{const id=event.target.dataset?.subscriptionId;if(id)try{const item=getState().regionData.subscriptions[id];commit(saveSubscription(getState(),id,{...item,active:event.target.checked},now()),'regionSettingsStatus','Suscripción actualizada.');}catch{}});
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-region-edit],[data-region-retract],[data-region-restore]');if(!button)return;
  const id=button.dataset.regionEdit||button.dataset.regionRetract||button.dataset.regionRestore,item=getState().regionData.offers[id];if(!item)return;
  try{
   if(button.dataset.regionEdit){const form=document.getElementById('regionalOfferForm');form.closest('details').open=true;form.elements.offerId.value=id;for(const key of ['country','platform','channel','mode','scope','season','episode','sourceUrl','checkedAt','expiresAt'])form.elements[key].value=item[key]??'';form.elements.verified.checked=item.verified;form.elements.platform.focus();return;}
   if(button.dataset.regionRetract&&!globalThis.confirm?.('¿Marcar retirada esta oferta? Se conserva el registro para restaurarlo.'))return;
   const candidate=button.dataset.regionRetract?retractRegionalOffer(getState(),id,now()):saveRegionalOffer(getState(),id,{...item,active:true},now());
   commit(candidate,'regionalOfferStatus','Registro actualizado; no se borró la evidencia.');
  }catch(error){const status=document.getElementById('regionalOfferStatus');if(status)status.textContent=error.message;}
 });
}
