/* v237.1 optional SPUN overlay — presentation only */
(function(){
'use strict';
const cfg=window.__SPUN_CONFIG_V237||{};
const S={version:'v237.1-spun-overlay',ready:false,enabled:false,error:'',layer:null};
window.__spunV237=S;
function install(){
 if(!cfg.available)return;
 try{
  if(typeof L==='undefined'||typeof map==='undefined')throw new Error('Leaflet/map unavailable');
  if(!Array.isArray(cfg.bounds)||cfg.bounds.length!==2||!cfg.image)throw new Error('Invalid SPUN config');
  const layer=L.imageOverlay(cfg.image,cfg.bounds,{opacity:Number(cfg.opacity)||.42,interactive:false,attribution:'SPUN · CC BY 4.0'});
  S.layer=layer;
  const C=L.Control.extend({options:{position:'bottomright'},onAdd(){
    const el=L.DomUtil.create('div','leaflet-bar');
    el.style.cssText='background:#fff;padding:5px 8px;font:700 11px/1.2 system-ui,sans-serif;cursor:pointer;user-select:none;border-radius:6px;opacity:.55';
    el.textContent='EcM SPUN';
    el.title='Warstwa informacyjna SPUN — nie zmienia score.';
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.on(el,'click',()=>{if(map.hasLayer(layer)){map.removeLayer(layer);S.enabled=false;el.style.opacity='.55';}else{layer.addTo(map);S.enabled=true;el.style.opacity='1';}});
    return el;
  }});
  new C().addTo(map);S.ready=true;
 }catch(e){S.error=e?.message||String(e);console.warn('SPUN v237.1 unavailable',e);}
}
window.auditSpunV237=()=>{const r={configured:!!cfg.available,ready:S.ready,enabled:S.enabled,error:S.error,scoringEffect:false};console.info('SPUN v237.1 AUDIT',r);return r;};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
