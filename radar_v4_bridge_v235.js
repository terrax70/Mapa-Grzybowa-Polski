/* Mapa Grzybów v235 — Radar v4 hybrid regional continuity + viewport fix
 * LOD policy:
 *   zoom <= 9 : keep existing lightweight 5 km/v3 national radar
 *   zoom 10   : Radar v4 1 km; radius >=50 km gets presentation-only continuity smoothing
 *   zoom 11   : Radar v4 1 km
 *   zoom 12   : Radar v4 500 m when present, otherwise 1 km
 *   zoom >=13 : exact local BDL layer (Radar v4 hidden)
 *
 * This file does NOT modify biological scoring, weather, observations, hotspot math,
 * national-prior math, or any existing local feature scores. It only replaces the
 * visual national-radar transport/render path at medium zooms.
 */
(function(){
'use strict';

const V235={
  version:'v235-radar-v4-national-context',
  baseUrl:'./data/radar_v4',
  calibrationUrl:'./data/radar_v4/calibration.json',
  enabled:true,
  ready:false,
  failed:false,
  error:'',
  manifest:null,
  calibration:null,
  loader:null,
  canvas:null,
  requestSeq:0,
  last:null,
  stats:{refreshes:0,fallbacks:0,cellsLoaded:0,cellsDrawn:0,lastFetchMs:0,lastDrawMs:0}
};
window.__radarV4V235=V235;
window.__radarV4V234=V235;
window.__radarV4V233=V235;
window.__radarV4V232=V235;

if(typeof window.RadarV4!=='function'){
  console.warn('V235 RADAR V4: RadarV4 loader missing; keeping previous radar.');
  return;
}
if(typeof map==='undefined'){
  console.warn('V235 RADAR V4: Leaflet map binding unavailable; keeping previous radar.');
  return;
}

const previousRefresh=(typeof refreshNationalRadar==='function')?refreshNationalRadar:null;
const previousAudit=(typeof auditNationalRadar==='function')?auditNationalRadar:null;

const legacyStyleBackup=new WeakMap();
let regionalUnderlayKey='';
let regionalUnderlayLayers=0;

function legacyLayerCount(){
  try{let n=0;if(typeof nationalRadarGroup!=='undefined'&&nationalRadarGroup?.eachLayer)nationalRadarGroup.eachLayer(()=>n++);return n;}catch(_){return 0;}
}
function restoreLegacyUnderlay(){
  try{
    if(typeof nationalRadarGroup==='undefined'||!nationalRadarGroup?.eachLayer)return;
    nationalRadarGroup.eachLayer(layer=>{
      const old=legacyStyleBackup.get(layer);
      if(old&&typeof layer.setStyle==='function')layer.setStyle(old);
    });
  }catch(_){ }
}
function softenLegacyUnderlay(){
  let n=0;
  try{
    if(typeof nationalRadarGroup==='undefined'||!nationalRadarGroup?.eachLayer)return 0;
    nationalRadarGroup.eachLayer(layer=>{
      n++;
      if(typeof layer.setStyle!=='function')return;
      if(!legacyStyleBackup.has(layer)){
        const o=layer.options||{};
        legacyStyleBackup.set(layer,{
          fillOpacity:Number.isFinite(Number(o.fillOpacity))?Number(o.fillOpacity):0.18,
          opacity:Number.isFinite(Number(o.opacity))?Number(o.opacity):0
        });
      }
      const o=layer.options||{},current=Number(o.fillOpacity);
      const fill=Number.isFinite(current)?Math.min(current,0.13):0.13;
      layer.setStyle({fillOpacity:Math.max(0.055,fill),opacity:0});
    });
  }catch(_){ }
  regionalUnderlayLayers=n;
  return n;
}
function analysisSignature(){
  try{
    const radius=(typeof RADIUS_KM!=='undefined'&&Number.isFinite(Number(RADIUS_KM)))?Number(RADIUS_KM):0;
    const centers=(typeof ANALYSIS_CENTERS!=='undefined'&&Array.isArray(ANALYSIS_CENTERS))
      ?ANALYSIS_CENTERS.map(a=>Array.isArray(a?.point)?a.point.map(v=>Number(v).toFixed(4)).join(','):'').join(';')
      :'';
    return `${radius}|${centers}`;
  }catch(_){return '';}
}
async function ensureRegionalUnderlay(target){
  if(!previousRefresh)return 0;
  const key=`${target?.kind||''}|${target?.type||''}|${analysisSignature()}`;
  const existing=legacyLayerCount();
  if(key===regionalUnderlayKey&&existing>0){
    regionalUnderlayLayers=softenLegacyUnderlay();
    return regionalUnderlayLayers;
  }
  restoreLegacyUnderlay();
  try{await Promise.resolve(previousRefresh());}catch(e){console.debug('V235 legacy underlay refresh skipped',e);}
  regionalUnderlayKey=key;
  regionalUnderlayLayers=softenLegacyUnderlay();
  return regionalUnderlayLayers;
}

function clamp01(v){v=Number(v);return Math.max(0,Math.min(1,Number.isFinite(v)?v:0));}
function smoothstep(a,b,x){if(!(b>a))return x>=b?1:0;const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);}
function havKm(a,b){
  if(typeof hav==='function')return hav(a,b);
  const R=6371,toRad=Math.PI/180;
  const p1=Number(a[0])*toRad,p2=Number(b[0])*toRad,dp=(Number(b[0])-Number(a[0]))*toRad,dl=(Number(b[1])-Number(a[1]))*toRad;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function mapBoundsObject(){
  const b=map.getBounds();
  return {west:b.getWest(),east:b.getEast(),south:b.getSouth(),north:b.getNorth()};
}

function viewportSignature(b){
  return [b.west,b.south,b.east,b.north].map(v=>Number(v).toFixed(5)).join(',');
}
function paddedViewportBounds(b){
  const dx=Math.min(.16,Math.max(.025,(b.east-b.west)*.07));
  const dy=Math.min(.10,Math.max(.018,(b.north-b.south)*.07));
  return {west:b.west-dx,east:b.east+dx,south:b.south-dy,north:b.north+dy};
}
function inSelectedAnalysis(cell){
  if(typeof ANALYSIS_CENTERS==='undefined'||!Array.isArray(ANALYSIS_CENTERS)||!ANALYSIS_CENTERS.length)return true;
  const radius=(typeof RADIUS_KM!=='undefined'&&Number.isFinite(Number(RADIUS_KM)))?Number(RADIUS_KM):Infinity;
  const c=[(cell.bounds.south+cell.bounds.north)/2,(cell.bounds.west+cell.bounds.east)/2];
  const pad=(Number(cell.cellMeters)||1000)/1000*.8;
  return ANALYSIS_CENTERS.some(a=>Array.isArray(a?.point)&&havKm(a.point,c)<=radius+pad);
}
function targetNow(){
  try{if(typeof nationalRadarTarget==='function')return nationalRadarTarget();}catch(_){ }
  return {kind:'overview',type:''};
}
function speciesLabel(type){
  try{if(typeof nationalRadarSpeciesLabel==='function')return nationalRadarSpeciesLabel(type);}catch(_){ }
  return V235.manifest?.species?.find(x=>x.id===type)?.label||type||'';
}
function rawUnits(cell,target){
  if(target.kind==='diversity')return Math.max(0,Math.round(Number(cell.diversity)||0));
  return Math.max(0,Math.round((Number(cell.raw)||0)*100));
}
function calibrationEntry(cellMeters,target){
  const l=V235.calibration?.lods?.[`${cellMeters}m`];if(!l)return null;
  if(target.kind==='species')return l.species?.[target.type]||null;
  if(target.kind==='diversity')return l.diversity||null;
  return l.overview||null;
}
function percentileFromEntry(entry,units){
  if(!entry||!Array.isArray(entry.counts)||!entry.counts.length)return NaN;
  if(!entry._prefix){
    const p=new Float64Array(entry.counts.length+1);let s=0;
    for(let i=0;i<entry.counts.length;i++){p[i]=s;s+=Number(entry.counts[i])||0;}
    p[entry.counts.length]=s;entry._prefix=p;entry._total=s;
  }
  const n=Number(entry._total)||0;if(n<=0)return NaN;
  const i=Math.max(0,Math.min(entry.counts.length-1,Math.round(units)));
  const less=entry._prefix[i],count=Number(entry.counts[i])||0;
  if(n<=1)return 1;
  if(count>0)return (less+(count-1)/2)/(n-1);
  // A quantized value absent from the country histogram: insertion percentile.
  return Math.max(0,Math.min(1,less/(n-1)));
}
function absoluteStrength(raw,target){
  try{if(typeof nationalRadarAbsoluteStrength==='function')return nationalRadarAbsoluteStrength(raw,target);}catch(_){ }
  if(!Number.isFinite(raw))return 0;
  if(target.kind==='diversity')return clamp01(raw/15);
  return clamp01((raw-4.6)/(8.9-4.6));
}
function visualInfo(cell,target,cellMeters){
  const raw=target.kind==='diversity'?Number(cell.diversity):Number(cell.raw);
  if(!Number.isFinite(raw))return null;
  const entry=calibrationEntry(cellMeters,target),pct=percentileFromEntry(entry,rawUnits(cell,target));
  if(!Number.isFinite(pct))return null;
  const absolute=absoluteStrength(raw,target);
  const visual=clamp01(.88*pct+.12*absolute);
  const coverage=Number(cell.coverage)||0,forest=Number(cell.forestHa)||0;
  const coverageFactor=.42+.58*Math.sqrt(clamp01(coverage/.42));
  const forestFactor=.48+.52*Math.sqrt(clamp01(forest/900));
  const relevance=clamp01(visual*coverageFactor*.75+visual*forestFactor*.25);
  return {raw,percentile:pct,absolute,visual,relevance,coverage,forest};
}
function colorFor(v){
  try{if(typeof nationalRadarColorVisual==='function')return nationalRadarColorVisual(v);}catch(_){ }
  const bands=(typeof UNIFIED_COLOR_BANDS!=='undefined'&&Array.isArray(UNIFIED_COLOR_BANDS)&&UNIFIED_COLOR_BANDS.length)
    ?UNIFIED_COLOR_BANDS:['#f2efe8','#e8dfd2','#d5c2b0','#d7b39d','#c78f72','#ca8850','#ae6a32','#a39f46','#718c41','#54ab5d','#2a914d','#116f38'];
  const p=clamp01((v-.10)/.90),i=Math.max(0,Math.min(bands.length-1,Math.floor(p*bands.length)));
  return bands[i]||bands[bands.length-1];
}
function opacityForV4(x,regional=false){
  // v232: do NOT reuse the legacy 5 km opacity curve here. At 1 km it was
  // making weak-but-valid forest cells fully transparent, producing holes.
  const v=clamp01(x.visual);
  const forestShare=clamp01((Number(x.forest)||0)/100); // 1 km cell = 100 ha
  const coverage=clamp01(Number(x.coverage)||0);
  const support=clamp01(Math.max(forestShare,coverage));
  if(!(support>0))return 0;
  const floor=regional?.10:.065;
  const span=regional?.34:.36;
  let a=(floor+span*smoothstep(.02,.98,v))*(.40+.60*Math.sqrt(support));
  return Math.max(.018,Math.min(.44,a));
}
function regionalModeNow(z){
  const radius=(typeof RADIUS_KM!=='undefined'&&Number.isFinite(Number(RADIUS_KM)))?Number(RADIUS_KM):0;
  return z===10&&radius>=50;
}
function smoothRegionalVisual(items){
  // Presentation-only smoothing of the v4 detail layer. It never creates a v4 cell where BDL says there
  // is no forest; it only softens score jumps between existing neighbouring
  // 1 km forest cells at the broad regional zoom.
  const by=new Map(items.map(it=>[`${it.cell.row}|${it.cell.col}`,it]));
  for(const it of items){
    let sum=0,w=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      const n=by.get(`${it.cell.row+dy}|${it.cell.col+dx}`);if(!n)continue;
      const ww=(dx===0||dy===0)?1:.65;sum+=n.vi.visual*ww;w+=ww;
    }
    const neigh=w?sum/w:it.vi.visual;
    it.displayVisual=clamp01(.72*it.vi.visual+.28*neigh);
  }
  return items;
}

function coarseContinuityRows(items,cellMeters){
  // Self-contained fallback underlay built from v4 itself. A 5x5 block is shown
  // only when at least one genuine v4/BDL forest cell exists in that block.
  // It generalises the broad z10 picture but never changes any cell score.
  if(cellMeters!==1000||!items.length)return [];
  const factor=5,groups=new Map();
  for(const it of items){
    const gy=Math.floor(it.cell.row/factor),gx=Math.floor(it.cell.col/factor),k=`${gy}|${gx}`;
    let g=groups.get(k);if(!g){g={gy,gx,sum:0,w:0,max:0,n:0};groups.set(k,g);}
    const ww=Math.max(.05,Math.min(1,(Number(it.vi.forest)||0)/100));
    g.sum+=it.displayVisual*ww;g.w+=ww;g.max=Math.max(g.max,it.displayVisual);g.n++;
  }
  const out=[];
  for(const g of groups.values()){
    const avg=g.w?g.sum/g.w:g.max,visual=clamp01(.78*avg+.22*g.max);
    let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
    for(let rr=g.gy*factor;rr<g.gy*factor+factor;rr++){
      for(const cc of [g.gx*factor,g.gx*factor+factor-1]){
        const b=V235.loader.cellBounds(rr,cc,cellMeters);west=Math.min(west,b.west);south=Math.min(south,b.south);east=Math.max(east,b.east);north=Math.max(north,b.north);
      }
    }
    if(!Number.isFinite(west))continue;
    const opacity=Math.max(.045,Math.min(.14,.055+.085*smoothstep(.04,.96,visual)));
    out.push({bounds:{west,south,east,north},opacity,color:colorFor(visual),coarse:true,displayVisual:visual});
  }
  return out;
}

class RadarCanvasV235{
  constructor(){this.el=null;this.rows=[];this._bound=()=>this.draw();}
  ensure(){
    if(this.el)return;
    const pane=(typeof nationalRadarGroup!=='undefined'&&map.getPane('nationalRadarPane'))?map.getPane('nationalRadarPane'):map.getPanes().overlayPane;
    const c=L.DomUtil.create('canvas','radar-v4-canvas-v235',pane);
    c.style.position='absolute';c.style.pointerEvents='none';c.style.opacity='1';c.style.zIndex='20';
    this.el=c;
    map.on('resize',this._bound);
  }
  setRows(rows){this.rows=rows||[];this.draw();}
  clear(){this.rows=[];if(this.el){const ctx=this.el.getContext('2d');ctx.clearRect(0,0,this.el.width,this.el.height);}}
  draw(){
    this.ensure();if(!this.el)return;
    const t0=performance.now(),size=map.getSize(),dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const w=Math.max(1,Math.round(size.x)),h=Math.max(1,Math.round(size.y));
    if(this.el.width!==Math.round(w*dpr)||this.el.height!==Math.round(h*dpr)){
      this.el.width=Math.round(w*dpr);this.el.height=Math.round(h*dpr);this.el.style.width=w+'px';this.el.style.height=h+'px';
    }
    L.DomUtil.setPosition(this.el,map.containerPointToLayerPoint([0,0]));
    const ctx=this.el.getContext('2d',{alpha:true});ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    let drawn=0;
    for(const r of this.rows){
      if(!(r.opacity>0))continue;
      const sw=map.latLngToContainerPoint([r.bounds.south,r.bounds.west]);
      const ne=map.latLngToContainerPoint([r.bounds.north,r.bounds.east]);
      const x=Math.floor(sw.x)-.75,y=Math.floor(ne.y)-.75,rw=Math.ceil(ne.x-sw.x)+1.5,rh=Math.ceil(sw.y-ne.y)+1.5;
      if(x>w||y>h||x+rw<0||y+rh<0)continue;
      ctx.globalAlpha=r.opacity;ctx.fillStyle=r.color;ctx.fillRect(x,y,Math.max(1,rw),Math.max(1,rh));drawn++;
    }
    ctx.globalAlpha=1;
    V235.stats.cellsDrawn=drawn;V235.stats.lastDrawMs=performance.now()-t0;
  }
}

async function initV235(){
  if(V235.ready)return true;if(V235.failed)return false;
  try{
    const loader=new RadarV4(V235.baseUrl,{maxCacheEntries:160});
    const [manifest,calResp]=await Promise.all([
      loader.init(),
      fetch(V235.calibrationUrl,{cache:'default'})
    ]);
    if(!calResp.ok)throw new Error(`calibration HTTP ${calResp.status}`);
    const calibration=await calResp.json();
    if(calibration?.format!=='MapaGrzybowRadarV4Calibration')throw new Error('nieprawidłowy calibration.json');
    if(calibration.modelDigest&&manifest.modelDigest&&calibration.modelDigest!==manifest.modelDigest)throw new Error('modelDigest manifest/calibration niezgodny');
    V235.loader=loader;V235.manifest=manifest;V235.calibration=calibration;V235.canvas=new RadarCanvasV235();V235.ready=true;V235.error='';
    console.info('V235 RADAR V4 READY',{lods:loader.availableLods(),modelDigest:manifest.modelDigest,species:manifest.species?.length||0});
    return true;
  }catch(e){
    V235.failed=true;V235.error=e?.message||String(e);console.warn('V235 RADAR V4 unavailable; fallback to previous radar.',e);return false;
  }
}
function wantedLod(){
  const z=map.getZoom();
  if(z<=9)return {kind:'legacy'};
  if(z>=13)return {kind:'exact'};
  const lods=V235.loader?.availableLods?.()||[];
  if(z===12&&lods.includes(500))return {kind:'v4',cellMeters:500};
  if(lods.includes(1000))return {kind:'v4',cellMeters:1000};
  if(lods.length)return {kind:'v4',cellMeters:Math.min(...lods)};
  return {kind:'legacy'};
}
function hideOldRadar(){try{restoreLegacyUnderlay();if(typeof nationalRadarGroup!=='undefined')nationalRadarGroup.clearLayers();regionalUnderlayKey='';regionalUnderlayLayers=0;}catch(_){ }}
function hideV4(){try{V235.canvas?.clear();}catch(_){ }}
function applyLegend(target){try{if(typeof nationalRadarApplyLegend==='function')nationalRadarApplyLegend(target);}catch(_){ }}
function hideLegendAtExact(){try{if(typeof updateScoreLegend==='function')updateScoreLegend();}catch(_){ }}

async function refreshV235(){
  const seq=++V235.requestSeq,V235Start=performance.now();V235.stats.refreshes++;
  if(typeof analysisCountryV252==='function'&&analysisCountryV252()==='DE'){
    hideV4();hideOldRadar();V235.last={mode:'germany-local',cells:0};return;
  }
  const z=map.getZoom();
  if(z<=9){
    hideV4();restoreLegacyUnderlay();regionalUnderlayKey='';regionalUnderlayLayers=0;V235.last={mode:'legacy',zoom:z};
    if(previousRefresh){const out=await Promise.resolve(previousRefresh());restoreLegacyUnderlay();return out;}
    return;
  }
  if(z>=13){
    hideV4();hideOldRadar();V235.last={mode:'exact-bdl',zoom:z,cells:0};
    try{nationalRadarLastKey='';nationalRadarLastCount=0;nationalRadarLastStats=null;}catch(_){ }
    hideLegendAtExact();return;
  }
  const ok=await initV235();
  if(!ok){V235.stats.fallbacks++;if(previousRefresh)return previousRefresh();return;}
  const mode=wantedLod();
  if(mode.kind!=='v4'){V235.stats.fallbacks++;if(previousRefresh)return previousRefresh();return;}
  const target=targetNow();
  if(target.kind==='species'&&!V235.manifest.species?.some(s=>s.id===target.type)){
    // edge/grassland species are intentionally absent from the BDL-only radar.
    V235.stats.fallbacks++;hideV4();if(previousRefresh)return previousRefresh();return;
  }
  const viewport=mapBoundsObject(),loadBounds=paddedViewportBounds(viewport),tileKeys=V235.loader.tileKeysForBounds(loadBounds,mode.cellMeters);
  const viewportSig=viewportSignature(viewport);
  const key=`v235|${mode.cellMeters}|${target.kind}|${target.type||''}|z${z}|${tileKeys.map(t=>t.y+','+t.x).join(';')}|r${typeof RADIUS_KM!=='undefined'?RADIUS_KM:''}|b${viewportSig}`;
  try{if(key===nationalRadarLastKey&&nationalRadarLastCount>0){V235.canvas?.draw();applyLegend(target);return;}}catch(_){ }
  try{
    const f0=performance.now();
    const cells=await V235.loader.loadViewport({cellMeters:mode.cellMeters,bounds:loadBounds,speciesId:target.kind==='species'?target.type:null,overview:target.kind!=='species'});
    if(seq!==V235.requestSeq)return;
    V235.stats.lastFetchMs=performance.now()-f0;V235.stats.cellsLoaded=cells.length;
    const regional=regionalModeNow(z);
    if(regional)await ensureRegionalUnderlay(target);
    else hideOldRadar();
    const items=[];let top10=0;
    for(const cell0 of cells){
      const cell={...cell0,cellMeters:mode.cellMeters};
      const vi=visualInfo(cell,target,mode.cellMeters);if(!vi)continue;
      items.push({cell,vi,displayVisual:vi.visual});if(vi.percentile>=.90)top10++;
    }
    if(regional)smoothRegionalVisual(items);
    const coarseRows=regional?coarseContinuityRows(items,mode.cellMeters):[];
    const rows=[];
    for(const it of items){
      const shownVi={...it.vi,visual:it.displayVisual};
      const opacity=opacityForV4(shownVi,regional);if(!(opacity>0))continue;
      rows.push({bounds:it.cell.bounds,opacity,color:colorFor(it.displayVisual),...it.vi,displayVisual:it.displayVisual});
    }
    if(!regional)hideOldRadar();V235.canvas.setRows(regional?[...coarseRows,...rows]:rows);
    const stats={
      n:cells.length,shown:rows.length,top10,target:target.kind==='species'?target.type:target.kind,
      lodMeters:mode.cellMeters,tiles:tileKeys.length,viewportSig,viewportPadding:true,regionalContinuity:regional,hybridUnderlay:regional,underlayLayers:regional?regionalUnderlayLayers:0,coarseUnderlayCells:regional?coarseRows.length:0,fetchMs:V235.stats.lastFetchMs,drawMs:V235.stats.lastDrawMs,
      bytes:V235.loader.stats.bytes,requests:V235.loader.stats.requests,cacheHits:V235.loader.stats.cacheHits
    };
    try{
      nationalRadarLastKey=key;nationalRadarLastCount=rows.length;nationalRadarLastStats=stats;nationalRadarLastError='';
    }catch(_){ }
    V235.last={mode:'v4',zoom:z,target,lodMeters:mode.cellMeters,cells:cells.length,shown:rows.length,tiles:tileKeys.length,viewportSig,viewportPadding:true,regionalContinuity:regional,hybridUnderlay:regional,underlayLayers:regional?regionalUnderlayLayers:0,coarseUnderlayCells:regional?coarseRows.length:0,continuityRule:regional?'legacy 5 km underlay when available + v4-derived 5 km support underlay + v4 1 km detail':'visible weak forest cells',totalMs:performance.now()-V235Start};
    applyLegend(target);
    console.debug('V235 RADAR V4 RENDER',V235.last);
  }catch(e){
    if(seq!==V235.requestSeq)return;
    V235.error=e?.message||String(e);V235.stats.fallbacks++;hideV4();
    console.warn('V235 RADAR V4 render failed; fallback to previous radar.',e);
    if(previousRefresh)return previousRefresh();
  }
}

async function auditV235(){
  const ok=await initV235();
  const report={
    version:V235.version,available:ok,error:V235.error,ready:V235.ready,
    lods:V235.loader?.availableLods?.()||[],modelDigest:V235.manifest?.modelDigest||null,
    species:V235.manifest?.species?.length||0,last:V235.last,loaderStats:V235.loader?{...V235.loader.stats,cacheEntries:V235.loader.cache.size}:null,
    stats:{...V235.stats},fallbackPreserved:!!previousRefresh,
    policy:'z<=9 legacy 5km national; z10-11 v4 1km national viewport; z12 v4 500m if available else 1km; z>=13 exact BDL; selected analysis radius does NOT clip national radar',
    calibration:V235.calibration?{format:V235.calibration.format,version:V235.calibration.version,method:V235.calibration.method}:null,
    note:'v235 keeps Radar v4 as viewport-wide national context at medium zooms instead of clipping it to selected analysis circles. v234 continuity and lazy tile loading are preserved. Local biology/scoring, DZIŚ, observations, hotspot math and national-prior math are unchanged.'
  };
  report.hybridUnderlay={active:!!(V235.last?.hybridUnderlay),layers:regionalUnderlayLayers,key:regionalUnderlayKey};console.info('V235 RADAR V4 AUDIT',report);return report;
}
window.auditRadarV4V235=auditV235;
window.auditRadarV4V234=auditV235;
window.auditRadarV4V233=auditV235;
window.auditRadarV4V232=auditV235;
window.auditRadarV4V231=auditV235;

// Rebind the existing scheduler target. Existing render()/species UI calls continue to work.
try{refreshNationalRadar=refreshV235;}catch(e){console.warn('V235: cannot rebind refreshNationalRadar',e);return;}
try{
  auditNationalRadar=function(){return auditV235();};
  window.auditNationalRadar=auditNationalRadar;
}catch(_){window.auditNationalRadar=auditV235;}

// The old code refreshed only after zoom changes. Tiled data must also follow pan/drag.
map.on('moveend',()=>{
  try{
    if(typeof scheduleNationalRadarRefresh==='function')scheduleNationalRadarRefresh();
    else refreshV235().catch(()=>{});
  }catch(_){ }
});

// Warm manifest/calibration after the page settles, without blocking first paint.
const warm=()=>initV235().then(()=>refreshV235()).catch(()=>{});
if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:1800});else setTimeout(warm,900);

})();
