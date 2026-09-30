/* Mapa Grzybów — Radar v4 tiled binary loader — v231
 * Loads only tiles required by the current viewport/target.
 * No biology/scoring formulas live here; this is transport + decode only.
 */
(function(global){
'use strict';

const MAGIC={base:'MGB4',overview:'MGO4',species:'MGS4'};
const HEADER={base:20,overview:20,species:22};
const REC={base:4,overview:4,species:6};
const td=new TextDecoder('ascii');

function readMagic(view){return td.decode(new Uint8Array(view.buffer,view.byteOffset,4));}
function cacheKey(kind,cell,y,x,species){return [kind,cell,y,x,species||''].join('|');}

class RadarV4{
 constructor(baseUrl='./data/radar_v4',{maxCacheEntries=128}={}){
   this.baseUrl=String(baseUrl||'./data/radar_v4').replace(/\/$/,'');
   this.manifest=null;
   this.maxCacheEntries=Math.max(8,Number(maxCacheEntries)||128);
   this.cache=new Map();
   this.inflight=new Map();
   this.stats={requests:0,cacheHits:0,inflightHits:0,bytes:0,fetchMs:0,decodeMs:0,errors:0};
 }
 async init(){
   if(this.manifest)return this.manifest;
   const r=await fetch(`${this.baseUrl}/manifest.json`,{cache:'default'});
   if(!r.ok)throw new Error(`Radar v4 manifest HTTP ${r.status}`);
   const m=await r.json();
   if(m?.format!=='MapaGrzybowRadarV4')throw new Error('Nieprawidłowy manifest Radar v4');
   this.manifest=m;
   return m;
 }
 lod(cellMeters){return this.manifest?.lods?.[`${cellMeters}m`]||null;}
 availableLods(){return Object.values(this.manifest?.lods||{}).map(x=>Number(x.cellMeters)).filter(Number.isFinite).sort((a,b)=>b-a);}
 _touch(k,v){
   if(this.cache.has(k))this.cache.delete(k);
   this.cache.set(k,v);
   while(this.cache.size>this.maxCacheEntries)this.cache.delete(this.cache.keys().next().value);
 }
 _grid(){
   const g=this.manifest?.grid||{};
   return {latOrigin:Number(g.latOrigin),lonOrigin:Number(g.lonOrigin),kmPerLatDegree:Number(g.kmPerLatDegree)||111.32};
 }
 _latStep(cellMeters){return (cellMeters/1000)/this._grid().kmPerLatDegree;}
 _rowForLat(lat,cellMeters){return Math.floor((lat-this._grid().latOrigin)/this._latStep(cellMeters));}
 _rowBounds(row,cellMeters){const d=this._latStep(cellMeters),s=this._grid().latOrigin+row*d;return [s,s+d];}
 _lonStep(row,cellMeters){
   const [s,n]=this._rowBounds(row,cellMeters),c=(s+n)/2;
   return (cellMeters/1000)/(this._grid().kmPerLatDegree*Math.max(.05,Math.cos(c*Math.PI/180)));
 }
 _colForLon(row,lon,cellMeters){return Math.floor((lon-this._grid().lonOrigin)/this._lonStep(row,cellMeters));}
 cellBounds(row,col,cellMeters){
   const [south,north]=this._rowBounds(row,cellMeters),d=this._lonStep(row,cellMeters),west=this._grid().lonOrigin+col*d;
   return {west,south,east:west+d,north};
 }
 tileKeysForBounds(bounds,cellMeters){
   const lod=this.lod(cellMeters);if(!lod)return [];
   const tc=lod.tileCells;
   const r0=this._rowForLat(bounds.south,cellMeters)-1,r1=this._rowForLat(bounds.north,cellMeters)+1;
   const available=new Set((lod.tiles||[]).filter(t=>Number(t.active)>0).map(t=>`${t.y}|${t.x}`));
   const out=new Map();
   for(let r=r0;r<=r1;r++){
     const [s,n]=this._rowBounds(r,cellMeters);if(n<=bounds.south||s>=bounds.north)continue;
     const c0=this._colForLon(r,bounds.west,cellMeters)-1,c1=this._colForLon(r,bounds.east,cellMeters)+1;
     for(let c=c0;c<=c1;c++){
       const b=this.cellBounds(r,c,cellMeters);if(b.east<=bounds.west||b.west>=bounds.east)continue;
       const y=Math.floor(r/tc),x=Math.floor(c/tc),k=`${y}|${x}`;
       if(available.has(k))out.set(k,{y,x});
     }
   }
   return [...out.values()];
 }
 async _fetch(kind,cellMeters,y,x,speciesId){
   const k=cacheKey(kind,cellMeters,y,x,speciesId);
   if(this.cache.has(k)){
     const v=this.cache.get(k);this._touch(k,v);this.stats.cacheHits++;return v;
   }
   if(this.inflight.has(k)){this.stats.inflightHits++;return this.inflight.get(k);}
   const job=(async()=>{
     let rel=`${cellMeters}m/${kind}/y${y}_x${x}.bin`;
     if(kind==='species')rel=`${cellMeters}m/species/${encodeURIComponent(speciesId)}/y${y}_x${x}.bin`;
     const t0=performance.now();
     const r=await fetch(`${this.baseUrl}/${rel}`,{cache:'default'});
     this.stats.fetchMs+=performance.now()-t0;this.stats.requests++;
     if(!r.ok)throw new Error(`Radar v4 HTTP ${r.status}: ${rel}`);
     const ab=await r.arrayBuffer();this.stats.bytes+=ab.byteLength;
     const d0=performance.now(),v=this._decode(kind,ab,cellMeters,y,x,speciesId);
     this.stats.decodeMs+=performance.now()-d0;
     this._touch(k,v);return v;
   })().catch(e=>{this.stats.errors++;throw e;}).finally(()=>this.inflight.delete(k));
   this.inflight.set(k,job);
   return job;
 }
 _decode(kind,ab,cellMeters,y,x,speciesId){
   const dv=new DataView(ab),magic=readMagic(dv),expected=MAGIC[kind];
   if(magic!==expected)throw new Error(`Radar v4 magic ${magic}, oczekiwano ${expected}`);
   const ver=dv.getUint16(4,true),cm=dv.getUint16(6,true),ty=dv.getInt32(8,true),tx=dv.getInt32(12,true),tc=dv.getUint16(16,true),rs=dv.getUint16(18,true);
   if(ver!==1||cm!==cellMeters||ty!==y||tx!==x||rs!==REC[kind])throw new Error(`Radar v4 header mismatch ${kind} y${y} x${x}`);
   let off=HEADER[kind],speciesIndex=null;
   if(kind==='species')speciesIndex=dv.getUint16(20,true);
   const n=tc*tc,need=off+n*rs;if(ab.byteLength!==need)throw new Error(`Radar v4 length mismatch ${ab.byteLength} != ${need}`);
   return {kind,cellMeters,y,x,tileCells:tc,speciesId,speciesIndex,buffer:ab,view:dv,offset:off,recordSize:rs};
 }
 _record(tile,i){
   const o=tile.offset+i*tile.recordSize,dv=tile.view;
   if(tile.kind==='base')return {forestHa:dv.getUint16(o,true)/10,coverage:dv.getUint16(o+2,true)/1000};
   if(tile.kind==='overview')return {raw:dv.getUint16(o,true)/100,bestSpeciesIndex:dv.getUint8(o+2),diversity:dv.getUint8(o+3)};
   return {raw:dv.getUint16(o,true)/100,quality:dv.getUint16(o+2,true)/100,goodShare:dv.getUint16(o+4,true)/1000};
 }
 async loadViewport({cellMeters,bounds,speciesId=null,overview=true}){
   await this.init();
   const lod=this.lod(cellMeters);if(!lod)throw new Error(`Brak LOD ${cellMeters}m`);
   if(speciesId&&!this.manifest.species?.some(s=>s.id===speciesId))throw new Error(`Radar v4: nieznany gatunek ${speciesId}`);
   const keys=this.tileKeysForBounds(bounds,cellMeters),chunks=await Promise.all(keys.map(async({y,x})=>{
     const [base,values]=await Promise.all([
       this._fetch('base',cellMeters,y,x),
       speciesId?this._fetch('species',cellMeters,y,x,speciesId):(overview?this._fetch('overview',cellMeters,y,x):null)
     ]);
     const tc=base.tileCells,rows=[];
     for(let i=0;i<tc*tc;i++){
       const b=this._record(base,i);if(b.forestHa<=0)continue;
       const lr=Math.floor(i/tc),lc=i%tc,row=y*tc+lr,col=x*tc+lc,bb=this.cellBounds(row,col,cellMeters);
       if(bb.east<=bounds.west||bb.west>=bounds.east||bb.north<=bounds.south||bb.south>=bounds.north)continue;
       rows.push({row,col,tileY:y,tileX:x,bounds:bb,...b,...(values?this._record(values,i):{})});
     }
     return rows;
   }));
   return chunks.flat();
 }
 resetStats(){this.stats={requests:0,cacheHits:0,inflightHits:0,bytes:0,fetchMs:0,decodeMs:0,errors:0};}
 clearCache(){this.cache.clear();this.inflight.clear();}
}

global.RadarV4=RadarV4;
})(typeof window!=='undefined'?window:globalThis);
