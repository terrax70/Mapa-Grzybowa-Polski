/* DLR/EOC Tree Species Germany 2022, CC BY 4.0, DOI 10.15489/smh8w3j8i962.
 * BfN Schutzgebiete WFS, attribution and methods: GERMANY_DATA.md.
 * NIBIS FORST25: point context only; no invented BDL site or stand age.
 */
'use strict';
const DE_SOURCES_V253={
 trees:'https://geoservice.dlr.de/eoc/land/wcs',
 protection:'https://geodienste.bfn.de/ogc/wfs/schutzgebiet',
 habitat:'https://nibis.lbeg.de/cardomap3/public/ogc.ashx',
 treeInfo:'https://geoservice.dlr.de/web/datasets/treespecies_de_2022',
 habitatInfo:'https://nibis.lbeg.de/cardomap3/?TH=618',
 protectionInfo:'https://www.bfn.de/daten-und-fakten/kartenanwendung-schutzgebiete-deutschland'
};
const DE_TREE_CODES_V253=['SO','SW','DG','MD','JD','BK','DB','BRZ','OL',null];
const DE_TREE_NAMES_V253=['sosna','świerk','daglezja','modrzew','jodła','buk','dąb','brzoza','olsza','inne drzewa'];
const deSourceCacheV253=new Map();
async function deFetchV253(url,kind='json'){
 const hit=deSourceCacheV253.get(url);if(hit)return hit;
 const task=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
   try{
     const response=await fetch(url,{signal:controller.signal});
     if(!response.ok)throw new Error('HTTP '+response.status);
     return kind==='buffer'?await response.arrayBuffer():await response.json();
   }finally{clearTimeout(timer);}
 })();
 deSourceCacheV253.set(url,task);
 try{
   const result=await task;
   while(deSourceCacheV253.size>32)deSourceCacheV253.delete(deSourceCacheV253.keys().next().value);
   return result;
 }catch(e){deSourceCacheV253.delete(url);throw e;}
}
function deRasterGridV253(buffer,raster){
 const {tags}=parseTiffDirectory(buffer),matrix=tags.get(34264),scale=tags.get(33550),tie=tags.get(33922);
 const keys=tags.get(34735)||[];
 let geographic=false;
 for(let i=4;i<keys.length;i+=4)if(keys[i]===2048&&keys[i+3]===4326)geographic=true;
 if(!geographic)throw new Error('DLR: nieoczekiwany układ współrzędnych rastra');
 let west,north,dx,dy;
 if(matrix){
   if(matrix[1]!==0||matrix[4]!==0)throw new Error('DLR: obrót siatki nieobsługiwany');
   [west,north,dx,dy]=[matrix[3],matrix[7],matrix[0],-matrix[5]];
 }else if(scale&&tie){
   [dx,dy]=scale;west=tie[3]-tie[0]*dx;north=tie[4]+tie[1]*dy;
 }
 if(![west,north,dx,dy].every(Number.isFinite)||dx<=0||dy<=0)throw new Error('DLR: brak georeferencji');
 return {...raster,west,north,dx,dy,east:west+raster.width*dx,south:north-raster.height*dy};
}
function deRepresentativePointV253(f){
 if(pointInGeom(f._center,f.geometry))return f._center;
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 // Scan interior horizontal segments; respects holes and disconnected polygons.
 for(const polygon of polygons){
   const bb=geometryFastBBox({type:'Polygon',coordinates:polygon});
   for(const fraction of [.5,.25,.75,.1,.9]){
     const y=bb[1]+(bb[3]-bb[1])*fraction,xs=[];
     for(const ring of polygon)for(let i=1;i<ring.length;i++){
       const a=ring[i-1],b=ring[i];
       if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
     }
     xs.sort((a,b)=>a-b);
     for(let i=0;i+1<xs.length;i+=2){const p=[y,(xs[i]+xs[i+1])/2];if(pointInGeom(p,f.geometry))return p;}
   }
 }
 return null;
}
function deTreeProfileV253(f,grid){
 const bb=geometryFastBBox(f.geometry);
 const x0=Math.max(0,Math.floor((bb[0]-grid.west)/grid.dx)),x1=Math.min(grid.width-1,Math.ceil((bb[2]-grid.west)/grid.dx));
 const y0=Math.max(0,Math.floor((grid.north-bb[3])/grid.dy)),y1=Math.min(grid.height-1,Math.ceil((grid.north-bb[1])/grid.dy));
 if(x0>x1||y0>y1)return null;
 const step=Math.max(1,Math.ceil(Math.sqrt((x1-x0+1)*(y1-y0+1)/4096)));
 const counts=new Array(10).fill(0);let total=0,loss=0;
 for(let y=y0;y<=y1;y+=step)for(let x=x0;x<=x1;x+=step){
   const point=[grid.north-(y+.5)*grid.dy,grid.west+(x+.5)*grid.dx];
   if(!pointInGeom(point,f.geometry))continue;
   total++;const value=grid.values[y*grid.width+x];
   if(Number.isInteger(value)&&value>=0&&value<=9)counts[value]++;
   else if(value===666)loss++;
 }
 const classified=counts.reduce((a,b)=>a+b,0);
 const coverage=total?classified/total:0;
 const groups=counts.map((count,id)=>({id,tree:DE_TREE_CODES_V253[id],label:DE_TREE_NAMES_V253[id],count,share:total?count/total:0})).filter(x=>x.count).sort((a,b)=>b.count-a.count);
 return {year:2022,nativeResolutionM:10,sampleSpacingM:Math.max(grid.dy*111320,grid.dx*111320*Math.cos(f._center[0]*Math.PI/180))*step,total,classified,coverage,lossFraction:total?loss/total:0,groups,usable:classified>=3&&coverage>=.2};
}
function deApplyTreeProfileV253(f,profile){
 f._dlrTrees=profile;
 // Fractions are sampled dominant-class coverage, never an inventory of all trees.
 f._standSpecies=profile?.usable?profile.groups.filter(g=>g.tree&&g.count>=3&&g.share>=.03).map(g=>({tree:g.tree,share:g.share,age:null,part:'',rank:1,storey:''})):[];
 f._standCompositionSource='dlr-2022-sampled';
 // Do not set species_cd: the old dominant-species shortcut assumes 100% host presence.
 delete f.properties.species_cd;
}
async function loadGermanTreesV253(features){
 let covered=0,failed=0;
 for(const area of ANALYSIS_CENTERS){
   const bb=bboxFor(area.point,RADIUS_KM);
   const size=Math.min(2048,Math.max(256,Math.ceil(RADIUS_KM*2000/20)));
   const params=new URLSearchParams({service:'WCS',version:'1.0.0',request:'GetCoverage',coverage:'land:TREE_SPECIES_DE_2022',crs:'EPSG:4326',response_crs:'EPSG:4326',bbox:bb.join(','),width:String(size),height:String(size),format:'GeoTIFF',interpolation:'nearest neighbor'});
   try{
     const buffer=await deFetchV253(DE_SOURCES_V253.trees+'?'+params,'buffer');
     const grid=deRasterGridV253(buffer,await parseSoilGeoTiff(buffer));
     for(let i=0;i<features.length;i++){
       const f=features[i],profile=deTreeProfileV253(f,grid);
       if(profile&&(!f._dlrTrees||profile.classified>f._dlrTrees.classified))deApplyTreeProfileV253(f,profile);
       if(i%25===0)await new Promise(r=>setTimeout(r,0));
     }
   }catch(e){failed++;console.warn('DLR tree source',e);}
 }
 covered=features.filter(f=>f._standSpecies?.length).length;
 const result={covered,total:features.length,failed,source:'DLR/EOC 2022'};
 window.__germanTreesV253=result;return result;
}
function deValidateCollectionV253(data){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Nieprawidłowa odpowiedź BfN');
 for(const f of data.features){
   if(!['Polygon','MultiPolygon'].includes(f.geometry?.type))throw new Error('BfN: brak geometrii obszaru');
   const bb=geometryFastBBox(f.geometry);
   if(!bb||bb[0]<-180||bb[2]>180||bb[1]<-90||bb[3]>90)throw new Error('BfN: nieprawidłowy układ współrzędnych');
 }
 return data.features;
}
async function loadGermanProtectionV253(){
 const features=new Map();let failed=0,complete=0;
 for(const area of ANALYSIS_CENTERS)for(const type of ['Naturschutzgebiete','Nationalparke']){
   const bb=bboxFor(area.point,RADIUS_KM);
   const pageIds=new Set();
   try{
     for(let start=0;start<2000;start+=200){
       // WFS 2 EPSG:4326 bbox uses latitude/longitude; returned GeoJSON is lon/lat.
       const params=new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:'schutzgebiet:'+type,srsName:'EPSG:4326',bbox:[bb[1],bb[0],bb[3],bb[2],'EPSG:4326'].join(','),outputFormat:'GEOJSON',count:'200',startIndex:String(start)});
       const rows=deValidateCollectionV253(await deFetchV253(DE_SOURCES_V253.protection+'?'+params));
       let added=0;
       for(const f of rows){
         const id=f.properties?.GmlID||f.id;
         if(!id)throw new Error('BfN: brak identyfikatora');
         if(!pageIds.has(id)){added++;pageIds.add(id);}
         if(!features.has(id)){f._src='bfn';f._fastBBox=geometryFastBBox(f.geometry);f.properties.name=f.properties.NAME||type;features.set(id,f);}
       }
       if(rows.length<200){complete++;break;}
       if(!added||start===1800)throw new Error('BfN: niepełna paginacja');
     }
   }catch(e){failed++;console.warn('BfN source',e);}
 }
 return {features:[...features.values()],failed,complete,ok:failed===0};
}
const deProtectionEdgeCacheV253=new WeakMap();
function deProtectionEdgesV253(geometry){
 const cached=deProtectionEdgeCacheV253.get(geometry);if(cached)return cached;
 const rings=(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).flat();
 const cells=new Map(),long=[];const size=.02;
 for(const ring of rings)for(let i=1;i<ring.length;i++){
   const a=ring[i-1],b=ring[i],edge={a,b,bb:[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])]};
   const x0=Math.floor(edge.bb[0]/size),x1=Math.floor(edge.bb[2]/size),y0=Math.floor(edge.bb[1]/size),y1=Math.floor(edge.bb[3]/size);
   if((x1-x0+1)*(y1-y0+1)>10000){long.push(edge);continue;}
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(edge);}
 }
 const value={rings,cells,long,size};deProtectionEdgeCacheV253.set(geometry,value);return value;
}
function deGeometriesOverlapV253(a,b){
 const aa=geometryFastBBox(a),bb=geometryFastBBox(b);
 if(aa[0]>bb[2]||aa[2]<bb[0]||aa[1]>bb[3]||aa[3]<bb[1])return false;
 const ar=(a.type==='Polygon'?[a.coordinates]:a.coordinates).flat(),index=deProtectionEdgesV253(b);
 // With no boundary crossing, one vertex per ring suffices for containment.
 for(const ring of ar){const p=ring[0];if(p&&pointInGeom([p[1],p[0]],b))return true;}
 for(const ring of index.rings){const p=ring[0];if(p&&pointInGeom([p[1],p[0]],a))return true;}
 const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 for(const ring of ar)for(let i=1;i<ring.length;i++){
   const p=ring[i-1],q=ring[i],minX=Math.min(p[0],q[0]),maxX=Math.max(p[0],q[0]),minY=Math.min(p[1],q[1]),maxY=Math.max(p[1],q[1]);
   const candidates=new Set(index.long),x0=Math.floor(minX/index.size),x1=Math.floor(maxX/index.size),y0=Math.floor(minY/index.size),y1=Math.floor(maxY/index.size);
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(const e of index.cells.get(x+','+y)||[])candidates.add(e);
   for(const e of candidates){
     if(maxX<e.bb[0]||e.bb[2]<minX||maxY<e.bb[1]||e.bb[3]<minY)continue;
     if(cross(p,q,e.a)*cross(p,q,e.b)<=0&&cross(e.a,e.b,p)*cross(e.a,e.b,q)<=0)return true;
   }
 }
 return false;
}
function deApplyProtectionV253(features,areas){
 for(const f of features){
   f._deProtected=areas.filter(r=>deGeometriesOverlapV253(f.geometry,r.geometry)).map(r=>({name:r.properties.name,source:r._src||'osm'}));
   if(f._deProtected.length)f._blocked=true;
 }
}
function deNIBISGeometryV253(g){
 const code=Number(g?.crs?.properties?.code);
 if(![4326,4647,25832].includes(code))throw new Error('NIBIS: nieznany układ współrzędnych');
 const convert=a=>typeof a[0]==='number'?(code===4326?a:proj4('+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs','EPSG:4326',[a[0]-(code===4647?32000000:0),a[1]])):a.map(convert);
 return {type:g.type,coordinates:convert(g.coordinates)};
}
async function loadGermanHabitatPointV253(point){
 // Submetre query envelopes are rounded to an empty geometry by this service.
 // Query a few metres, then reject any returned polygon not containing the exact point.
 const [lat,lon]=point,delta=.002;
 const params=new URLSearchParams({NodeId:'46',Service:'WMS',Request:'GetFeatureInfo',VERSION:'1.1.1',LAYERS:'L5',QUERY_LAYERS:'L5',SRS:'EPSG:4326',BBOX:[lon-delta,lat-delta,lon+delta,lat+delta].join(','),WIDTH:'101',HEIGHT:'101',X:'50',Y:'50',INFO_FORMAT:'application/geo+json',FEATURE_COUNT:'5'});
 const data=await deFetchV253(DE_SOURCES_V253.habitat+'?'+params);
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('NIBIS: nieprawidłowa odpowiedź');
 const feature=data.features.find(f=>f.geometry&&pointInGeom(point,deNIBISGeometryV253(f.geometry)));
 return feature?{state:'ok',point,properties:feature.properties}: {state:'empty',point};
}
async function ensureGermanHabitatV253(f){
 if(f?._src!=='osm-de'||f._nibisHabitat)return;
 const point=deRepresentativePointV253(f);if(!point)return;
 f._nibisHabitat={state:'loading',point};
 try{f._nibisHabitat=await loadGermanHabitatPointV253(point);}catch(e){f._nibisHabitat={state:'error',point};}
 if(analysisCountryV252()==='DE'&&linkedLockedFeature===f){resetUnifiedDetailsDomCache();refreshUnifiedDetails({preserveScroll:true,flash:false});}
}
function germanSourceDetailsV253(f){
 if(f?._src!=='osm-de')return '';
 const profile=f._dlrTrees,nibis=f._nibisHabitat;
 const trees=profile?.groups?.length?profile.groups.map(g=>`${g.label}: ${Math.round(g.share*100)}%`).join(', '):'Brak klasyfikacji drzew w tym obszarze.';
 let habitat='Opis siedliska NIBIS jest pobierany po otwarciu miejsca.';
 if(nibis?.state==='loading')habitat='Pobieram opis siedliska NIBIS…';
 if(nibis?.state==='empty')habitat='Brak opisu NIBIS w punkcie kontrolnym; źródło obejmuje wybrane lasy Dolnej Saksonii.';
 if(nibis?.state==='error')habitat='NIBIS chwilowo niedostępne. Ocena nadal korzysta z pozostałych danych.';
 if(nibis?.state==='ok'){
   const p=nibis.properties;
   habitat='Opis źródłowy (DE): '+[p.WHZ_FSTEINL,p.NZ_FSTEINL,p.SZLZ_FSTEINL].filter(Boolean).join(' • ');
 }
 return `<details class="popup-more" open><summary>🌳 Dane o lesie w Niemczech</summary>
 <div class="popup-mini"><a href="${DE_SOURCES_V253.treeInfo}" target="_blank" rel="noopener">DLR/EOC • drzewa 2022 • CC BY 4.0</a><br>${escapeHtml(trees)}
 ${profile?`<br>Rozpoznane drzewa: ${Math.round(profile.coverage*100)}% próbek; utrata koron: ${Math.round(profile.lossFraction*100)}%. Krok próbkowania ok. ${Math.round(profile.sampleSpacingM)} m.`:''}
 <br>Udziały dotyczą próbek mapy dominujących drzew z 2022 r. Brak inwentaryzacji wieku i pełnego składu drzewostanu.</div>
 <div class="popup-mini"><a href="${DE_SOURCES_V253.habitatInfo}" target="_blank" rel="noopener">NIBIS® / LBEG • FORST25</a><br>${escapeHtml(habitat)}
 ${nibis?.point?`<br>Punkt kontrolny: ${nibis.point[0].toFixed(5)}, ${nibis.point[1].toFixed(5)}. Opis dotyczy tego punktu; nie zmienia oceny całego lasu.`:''}</div>
 <div class="popup-mini"><a href="${DE_SOURCES_V253.protectionInfo}" target="_blank" rel="noopener">Źródło ochrony: Bundesamt für Naturschutz (BfN), odczyt ${new Date().getFullYear()}</a>${f._deProtected?.length?'<br>Obszar przecina teren chroniony: '+escapeHtml(f._deProtected.map(x=>x.name).join(', '))+'. Pominięty w rankingu; sprawdź lokalne zasady.':''}</div></details>`;
}
function germanTreeTextV253(f){
 const groups=f?._dlrTrees?.groups;
 return groups?.length?'DLR 2022: '+groups.slice(0,3).map(g=>`${g.label} ${Math.round(g.share*100)}%`).join(', '):'Brak klasyfikacji drzew DLR';
}
