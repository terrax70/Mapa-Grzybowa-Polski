/* Mapa Grzybów v235 — OSM radius cap + legend/UI stability + radius-transition diagnostics
 * Performance/UI orchestration only. Does NOT change mushroom scoring, biology,
 * weather, observation evidence, hotspot math or national-prior math.
 */
(function(){
'use strict';

const S={
  version:'v235-osm10-radar-ui',
  osmMaxKm:10,
  overpassCalls:0,
  cappedCalls:0,
  bboxCaps:0,
  aroundCaps:0,
  lastOverpass:null,
  legendFixCalls:0,
  desktopLegendMoves:0,
  radiusTransitions:[],
  installedAt:new Date().toISOString()
};
window.__v235Runtime=S;

function n(v){ const x=Number(v); return Number.isFinite(x)?x:NaN; }
function f6(v){ return Number(v).toFixed(6).replace(/\.?0+$/,''); }

function capOverpassQuery(q){
  q=String(q||'');
  let changed=false, bboxCaps=0, aroundCaps=0, maxBeforeKm=0;

  q=q.replace(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g,
    (m,ss,ww,nn,ee)=>{
      const south=n(ss),west=n(ww),north=n(nn),east=n(ee);
      if(![south,west,north,east].every(Number.isFinite))return m;
      if(Math.abs(south)>90||Math.abs(north)>90||Math.abs(west)>180||Math.abs(east)>180||north<=south)return m;
      const lat=(south+north)/2,lon=(west+east)/2;
      const cos=Math.max(.15,Math.cos(lat*Math.PI/180));
      const latHalfKm=(north-south)*111.32/2;
      const lonHalfKm=(east-west)*111.32*cos/2;
      const before=Math.max(latHalfKm,lonHalfKm);
      maxBeforeKm=Math.max(maxBeforeKm,before);
      if(before<=S.osmMaxKm+0.05)return m;
      const dLat=S.osmMaxKm/111.32;
      const dLon=S.osmMaxKm/(111.32*cos);
      changed=true;bboxCaps++;
      return `(${f6(lat-dLat)},${f6(lon-dLon)},${f6(lat+dLat)},${f6(lon+dLon)})`;
    });

  q=q.replace(/around\s*:\s*(\d+(?:\.\d+)?)/gi,(m,val)=>{
    const meters=Number(val);
    if(!Number.isFinite(meters)||meters<=S.osmMaxKm*1000)return m;
    changed=true;aroundCaps++;
    maxBeforeKm=Math.max(maxBeforeKm,meters/1000);
    return m.replace(val,String(S.osmMaxKm*1000));
  });

  return {query:q,changed,bboxCaps,aroundCaps,maxBeforeKm};
}

function patchOverpassBody(body){
  if(typeof body!=='string')return {body,changed:false,bboxCaps:0,aroundCaps:0,maxBeforeKm:0};
  try{
    const p=new URLSearchParams(body);
    const q=p.get('data');
    if(q==null)return {body,changed:false,bboxCaps:0,aroundCaps:0,maxBeforeKm:0};
    const r=capOverpassQuery(q);
    if(!r.changed)return {body,...r};
    p.set('data',r.query);
    return {body:p.toString(),...r};
  }catch(_){
    return {body,changed:false,bboxCaps:0,aroundCaps:0,maxBeforeKm:0};
  }
}

function installOverpassCap(){
  if(typeof fetchOverpassWithFallback!=='function')return false;
  if(fetchOverpassWithFallback.__v235Wrapped)return true;
  const original=fetchOverpassWithFallback;
  const wrapped=async function(body,options={}){
    if(options.countryForest==='DE')return original.call(this,body,options);
    S.overpassCalls++;
    const r=patchOverpassBody(body);
    if(r.changed){
      S.cappedCalls++;S.bboxCaps+=r.bboxCaps;S.aroundCaps+=r.aroundCaps;
      console.info('V235 OSM CAP 10KM',{
        call:S.overpassCalls,bboxCaps:r.bboxCaps,aroundCaps:r.aroundCaps,
        maxBeforeKm:Number(r.maxBeforeKm.toFixed(2)),maxAfterKm:S.osmMaxKm
      });
    }
    S.lastOverpass={
      at:Date.now(),changed:r.changed,bboxCaps:r.bboxCaps,aroundCaps:r.aroundCaps,
      maxBeforeKm:Number((r.maxBeforeKm||0).toFixed(2)),maxAfterKm:S.osmMaxKm
    };
    return original.call(this,r.body,options);
  };
  wrapped.__v235Wrapped=true;
  wrapped.__v235Original=original;
  try{fetchOverpassWithFallback=wrapped;}catch(_){}
  try{window.fetchOverpassWithFallback=wrapped;}catch(_){}
  return true;
}

function radarOwnsLegend(){
  if(typeof analysisCountryV252==='function'&&analysisCountryV252()==='DE')return false;
  try{
    if(typeof map==='undefined'||!map||typeof map.getZoom!=='function')return false;
    return map.getZoom()<=12;
  }catch(_){return false;}
}

function installLegendStability(){
  if(typeof updateScoreLegend!=='function')return false;
  if(updateScoreLegend.__v235Wrapped)return true;
  const original=updateScoreLegend;
  const wrapped=function(){
    if(radarOwnsLegend() && typeof nationalRadarApplyLegend==='function'){
      try{
        const t=(typeof nationalRadarTarget==='function')?nationalRadarTarget():{kind:'overview',type:''};
        S.legendFixCalls++;
        return nationalRadarApplyLegend(t);
      }catch(_){}
    }
    return original.apply(this,arguments);
  };
  wrapped.__v235Wrapped=true;
  wrapped.__v235Original=original;
  try{updateScoreLegend=wrapped;}catch(_){}
  try{window.updateScoreLegend=wrapped;}catch(_){}
  return true;
}

function overlaps(a,b){
  return !!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
}
let legendBaseline=null;
function rememberLegendBaseline(legend){
  if(legendBaseline)return;
  legendBaseline={
    right:legend.style.getPropertyValue('right'),
    rightPriority:legend.style.getPropertyPriority('right'),
    left:legend.style.getPropertyValue('left'),
    leftPriority:legend.style.getPropertyPriority('left')
  };
}
function restoreLegendBaseline(legend){
  if(!legendBaseline)return;
  if(legendBaseline.right)legend.style.setProperty('right',legendBaseline.right,legendBaseline.rightPriority);
  else legend.style.removeProperty('right');
  if(legendBaseline.left)legend.style.setProperty('left',legendBaseline.left,legendBaseline.leftPriority);
  else legend.style.removeProperty('left');
}
function fixDesktopLegendOverlap(){
  const legend=document.getElementById('scoreLegend');
  if(!legend)return;
  rememberLegendBaseline(legend);
  // Always start from the page's own CSS/inline state. This avoids accumulating
  // offsets after resizes and guarantees that mobile keeps the v210 layout.
  restoreLegendBaseline(legend);
  if(window.innerWidth<=700)return;
  const zoom=document.querySelector('.leaflet-control-zoom');
  const mapEl=document.getElementById('map');
  if(!zoom||!mapEl)return;
  const lr=legend.getBoundingClientRect(),zr=zoom.getBoundingClientRect(),mr=mapEl.getBoundingClientRect();
  if(!overlaps(lr,zr))return;
  if(zr.left>mr.left+mr.width/2){
    const current=parseFloat(getComputedStyle(legend).right)||12;
    const delta=(lr.right-zr.left)+12;
    legend.style.setProperty('right',`${Math.ceil(current+delta)}px`,'important');
  }else{
    const current=parseFloat(getComputedStyle(legend).left);
    if(Number.isFinite(current)){
      const delta=(zr.right-lr.left)+12;
      legend.style.setProperty('left',`${Math.ceil(current+delta)}px`,'important');
    }else{
      // Fallback for a right-anchored legend: move it left by increasing "right".
      const right=parseFloat(getComputedStyle(legend).right)||12;
      legend.style.setProperty('right',`${Math.ceil(right+56)}px`,'important');
    }
  }
  S.desktopLegendMoves++;
}

function safeLayerCount(){
  try{
    if(typeof analysisLayers!=='undefined'&&Array.isArray(analysisLayers))return analysisLayers.length;
  }catch(_){}
  return null;
}
function safeFeatureCount(){
  try{
    if(typeof allFeatures!=='undefined'&&Array.isArray(allFeatures))return allFeatures.length;
  }catch(_){}
  return null;
}

let activeRadiusDiag=null;
function beginRadiusDiag(from,to){
  const rec={
    id:Date.now(),from:Number(from),to:Number(to),startedAt:performance.now(),
    renderCalls:0,perfRenderCalls:0,samples:[]
  };
  activeRadiusDiag=rec;S.radiusTransitions.push(rec);
  if(S.radiusTransitions.length>12)S.radiusTransitions.splice(0,S.radiusTransitions.length-12);
  const sample=(label)=>{
    rec.samples.push({
      label,tMs:Number((performance.now()-rec.startedAt).toFixed(1)),
      features:safeFeatureCount(),layers:safeLayerCount(),
      scoringReady:(typeof analysisScoringReady!=='undefined')?!!analysisScoringReady:null,
      running:(typeof analysisRunning!=='undefined')?!!analysisRunning:null
    });
  };
  requestAnimationFrame(()=>sample('raf1'));
  requestAnimationFrame(()=>requestAnimationFrame(()=>sample('raf2')));
  [80,180,400,800,1600,2800].forEach(ms=>setTimeout(()=>sample(`${ms}ms`),ms));
  setTimeout(()=>{if(activeRadiusDiag===rec)activeRadiusDiag=null;},3200);
  console.info('V235 RADIUS TRANSITION START',{from:Number(from),to:Number(to),id:rec.id});
}

function installRadiusDiagnostics(){
  try{
    if(typeof render==='function'&&!render.__v235DiagWrapped){
      const orig=render;
      const w=function(){ if(activeRadiusDiag)activeRadiusDiag.renderCalls++; return orig.apply(this,arguments); };
      w.__v235DiagWrapped=true;w.__v235Original=orig;
      render=w;try{window.render=w;}catch(_){}
    }
  }catch(_){}
  try{
    if(typeof perfRenderNow==='function'&&!perfRenderNow.__v235DiagWrapped){
      const orig=perfRenderNow;
      const w=function(){ if(activeRadiusDiag)activeRadiusDiag.perfRenderCalls++; return orig.apply(this,arguments); };
      w.__v235DiagWrapped=true;w.__v235Original=orig;
      perfRenderNow=w;try{window.perfRenderNow=w;}catch(_){}
    }
  }catch(_){}

  let el=null;
  try{
    if(typeof radiusSelect!=='undefined'&&radiusSelect?.addEventListener)el=radiusSelect;
  }catch(_){}
  if(!el)el=document.querySelector('select[id*="radius" i],input[id*="radius" i]');
  if(!el||el.__v235DiagBound)return !!el;
  el.__v235DiagBound=true;
  let previous=(typeof RADIUS_KM!=='undefined')?Number(RADIUS_KM):Number(el.value);
  el.addEventListener('change',()=>{
    const next=Number(el.value);
    beginRadiusDiag(previous,next);
    previous=next;
  },true);
  return true;
}

function install(){
  const osm=installOverpassCap();
  const legend=installLegendStability();
  installRadiusDiagnostics();
  fixDesktopLegendOverlap();
  window.addEventListener('resize',()=>requestAnimationFrame(fixDesktopLegendOverlap),{passive:true});
  try{
    if(typeof ResizeObserver==='function'){
      const el=document.getElementById('scoreLegend');
      if(el)new ResizeObserver(()=>requestAnimationFrame(fixDesktopLegendOverlap)).observe(el);
    }
  }catch(_){}
  console.info('V235 RUNTIME READY',{osmCapInstalled:osm,legendStabilityInstalled:legend,osmMaxKm:S.osmMaxKm});
}

window.auditV235=function(){
  let legend=null,zoom=null,overlap=false;
  try{
    const l=document.getElementById('scoreLegend'),z=document.querySelector('.leaflet-control-zoom');
    if(l)legend={text:l.innerText,rect:l.getBoundingClientRect().toJSON?.()||null};
    if(z)zoom={rect:z.getBoundingClientRect().toJSON?.()||null};
    if(l&&z)overlap=overlaps(l.getBoundingClientRect(),z.getBoundingClientRect());
  }catch(_){}
  const radar=window.__radarV4V235||window.__radarV4V234||null;
  const report={
    version:S.version,osmMaxKm:S.osmMaxKm,
    overpass:{calls:S.overpassCalls,cappedCalls:S.cappedCalls,bboxCaps:S.bboxCaps,aroundCaps:S.aroundCaps,last:S.lastOverpass},
    legend:{fixCalls:S.legendFixCalls,desktopMoves:S.desktopLegendMoves,overlapNow:overlap,legend,zoom},
    radiusTransitions:S.radiusTransitions.slice(),
    radar:radar?{version:radar.version,last:radar.last,stats:radar.stats}:null,
    guarantees:{
      scoringChanged:false,biologyChanged:false,weatherChanged:false,observationsChanged:false,
      osmNetworkRadiusMaxKm:10,nationalRadarClippedToAnalysis:false
    }
  };
  console.info('V235 AUDIT',report);return report;
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();

})();
