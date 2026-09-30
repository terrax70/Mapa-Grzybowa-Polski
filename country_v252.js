/* Poland: BDL. Germany: OSM forest outlines, without invented inventory data.
 * OSM contributors, ODbL: https://www.openstreetmap.org/copyright
 * Geometry conversion: vendored osmtogeojson (MIT), including multipolygon holes.
 */
'use strict';
function analysisCountryV252(){
 return ANALYSIS_CENTERS[0]?.countryCode||'PL';
}
function syncCountryUiV252(country){
 const de=country==='DE';
 const label=document.getElementById('dsBDL')?.previousElementSibling;
 if(label)label.textContent=de?'Lasy OSM + gatunki drzew DLR 2022':'BDL: las / siedlisko / wiek';
 const toggle=document.getElementById('toggleBDL');
 if(toggle){toggle.disabled=de;toggle.title=de?'Warstwa BDL obejmuje Polskę':'Warstwa BDL';}
 const top=document.getElementById('nationalTopOpen');
 if(top){top.disabled=de;top.title=de?'Ranking TOP Polska nie obejmuje Niemiec':'Najlepsze modelowo miejsca w Polsce';}
 document.getElementById('nationalTopPanel')?.classList.remove('open');
 for(const option of radiusSelect.options)option.disabled=de&&Number(option.value)>40;
 if(de&&Number(radiusSelect.value)>40)radiusSelect.value='40';
 if(de)hideBdlFallback();
 document.documentElement.dataset.analysisCountry=country;
}
// Resolve map clicks/GPS through country metadata, never through overlapping bboxes.
let pointRequestV252=0;
async function addResolvedPointV252(name,lat,lon){
 const request=++pointRequestV252;
 locatorHint.textContent='Sprawdzam kraj wybranego punktu…';
 try{
   const place=await window.mapGeocoderV249.reverse(lat,lon);
   if(request!==pointRequestV252)return;
   if(!place){locatorHint.textContent='Wybierz punkt w Polsce lub Niemczech.';return;}
   addDraft(cleanPlaceName(place.display_name)||name,lat,lon,place.countryCode);
 }catch(e){locatorHint.textContent='Nie udało się ustalić kraju. Wyszukaj adres lub spróbuj ponownie.';}
}
function germanForestFeaturesV252(data){
 if(data?.remark)throw new Error('OSM zwróciło niepełną odpowiedź: '+data.remark);
 const collection=osmtogeojson(data,{flatProperties:true});
 const forest=[],protectedAreas=[];
 for(const f of collection.features||[]){
   if(!['Polygon','MultiPolygon'].includes(f.geometry?.type)||f.properties?.tainted)continue;
   const p=f.properties||{};
   const protection=p.leisure==='nature_reserve'||p.boundary==='national_park'||
     (p.boundary==='protected_area'&&/^(1|1a|1b|2)$/.test(String(p.protect_class)));
   if(protection){f._fastBBox=geometryFastBBox(f.geometry);protectedAreas.push(f);}
   if(p.landuse!=='forest'&&p.natural!=='wood')continue;
   f._src='osm-de';f._kind='forest';f._countryCode='DE';
   f._center=geomCenter(f.geometry);
   // Include intersecting large forests even if their centroid lies outside the circle.
   if(!ANALYSIS_CENTERS.some(a=>germanGeometryIntersectsV252(f.geometry,a.point,RADIUS_KM)))continue;
   const nearest=nearestAreaInfo(f._center);
   f._distance=nearest.distance;f._centerName=nearest.name;
   f._blocked=p.access==='no'||p.access==='private';
   f._nearSpecies=[];f._standSpecies=[];f._standCompositionSource='osm-tags';
   // leaf_type never implies a particular host species or forest age.
   f.properties={...p,adress_forest:'OSM '+f.id,sub_area:geomAreaHa(f.geometry)};
   forest.push(f);
 }
 return {forest,protectedAreas};
}
function germanGeometryIntersectsV252(geometry,point,radius){
 if(pointInGeom(point,geometry))return true;
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 const scaleX=111.32*Math.cos(point[0]*Math.PI/180),scaleY=111.32;
 for(const polygon of polygons)for(const ring of polygon)for(let i=1;i<ring.length;i++){
   const a=[(ring[i-1][0]-point[1])*scaleX,(ring[i-1][1]-point[0])*scaleY];
   const b=[(ring[i][0]-point[1])*scaleX,(ring[i][1]-point[0])*scaleY];
   const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
   const t=den?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/den)):0;
   if(Math.hypot(a[0]+t*dx,a[1]+t*dy)<=radius)return true;
 }
 return false;
}
async function loadGermanForestsV252(){
 const elements=new Map();
 for(const area of ANALYSIS_CENTERS){
   const bb=bboxFor(area.point,RADIUS_KM);
   const bounds=[bb[1],bb[0],bb[3],bb[2]].join(',');
   const query=`[out:json][timeout:25];(nwr[landuse=forest](${bounds});nwr[natural=wood](${bounds});nwr[leisure=nature_reserve](${bounds});nwr[boundary=national_park](${bounds});nwr[boundary=protected_area][protect_class~"^(1|1a|1b|2)$"](${bounds}););out body geom;`;
   const data=await fetchOverpassWithFallback('data='+encodeURIComponent(query),{optional:false,countryForest:'DE'});
   if(data?.remark)throw new Error('Niepełne dane OSM: '+data.remark);
   if(!Array.isArray(data?.elements))throw new Error('Nieprawidłowa odpowiedź OSM');
   for(const element of data.elements)elements.set(element.type+'/'+element.id,element);
 }
 return germanForestFeaturesV252({elements:[...elements.values()]});
}
async function mainGermanyV252(){
 window.__germanTreesV253=null;window.__germanProtectionV253=null;
 regionalOverviewModeV227=false;
 resetSourceStates();perfResetSourceTimings();
 validationForestBaseMode='osm-de-limited';validationKoOutcome=null;
 hideBdlFallback();
 hotspotAccessSeq++;clearTimeout(hotspotAccessTimer);
 hotspotAccessRoads=[];hotspotAccessParking=[];forestParkingGroup.clearLayers();
 hotspotAccessReady=false;hotspotParkingReady=false;hotspotRoadReady=false;
 hotspotAccessLoading=false;hotspotAccessQueryKey='';hotspotAccessRetryAfter=0;
 hotspotAccessLastError='';hotspotAccessInfoCacheTokenV210='';hotspotAccessInfoCacheV210=new Map();
 forestParkingRowsCacheKeyV210='';forestParkingRowsCacheV210=[];hotspotAccessUiRefreshTokenV210++;
 const st=document.getElementById('status'),ds=document.getElementById('dsBDL');
 const limitation='Niemcy • drzewa DLR 2022 tam, gdzie dostępne. Brak wieku drzew; wynik orientacyjny. Opis siedliska NIBIS w szczegółach miejsca.';
 st.textContent='Pobieram lasy w Niemczech…';showAnalysisLoader('Pobieram zasięgi lasów OSM…');
 setSourceState('forest','load','Niemcy: OpenStreetMap');
 setSourceState('habitat','off','NIBIS FORST25: opis punktu w szczegółach miejsca; nie zastępuje inwentaryzacji lasu');
 const work=[];
 const run=(id,fn,ready,detail)=>{
   setSourceState(id,'load',detail);
   const promise=Promise.resolve().then(fn).then(()=>{
     const ok=ready();setSourceState(id,ok?'ok':'error',ok?detail:'Źródło niedostępne lub brak danych');return ok;
   }).catch(e=>{setSourceState(id,'error',String(e.message||e));return false;});
   work.push(promise);return promise;
 };
 run('weather',loadWeather,()=>weatherReady,'Pogoda Open-Meteo dla wybranej lokalizacji');
 try{
   const {forest,protectedAreas}=await loadGermanForestsV252();
   const forestCount=forest.length;
   if(!forest.length)throw new Error('Brak geometrii lasów OSM w wybranym promieniu. Zmień punkt lub promień.');
   reserves=protectedAreas;
   for(const r of reserves)L.geoJSON(r,{
     style:{color:'#ff334f',weight:2,fillOpacity:.12,dashArray:'7 5'},
     onEachFeature:(f,l)=>l.bindPopup('<b>'+escapeHtml(f.properties?.name||'Obszar chroniony OSM')+'</b><br>Sprawdź lokalne zasady dostępu i zbioru.')
   }).addTo(reserveGroup);
   for(const f of forest)f._blocked=f._blocked||inReserve(f);
   setSourceState('reserve','load','Pobieram oficjalne granice BfN; OSM jako uzupełnienie');
   deferSecondaryRenders=true;
   renderForestBaseImmediately([...forest],'OSM • pobieram drzewa DLR');
   setSourceState('forest','load',`${forestCount} obszarów OSM; pobieram gatunki drzew DLR 2022`);
   work.push(loadGermanTreesV253(forest).then(result=>{
     setSourceState('forest',result.covered?'ok':'error',`OSM: ${forestCount} lasów. DLR 2022: ${result.covered}/${result.total} z danymi o drzewach${result.failed?' • część pobierania nieudana':''}. Brak wieku drzew.`);
     ds.textContent=`${forestCount} lasów • DLR ${result.covered}/${result.total}`;
   }).catch(e=>setSourceState('forest','error','Drzewa DLR niedostępne; pozostają zasięgi lasów OSM')));
   work.push(loadGermanProtectionV253().then(result=>{
     for(const r of result.features){
       reserves.push(r);
       L.geoJSON(r,{style:{color:'#ff334f',weight:2,fillOpacity:.12,dashArray:'7 5'},onEachFeature:(f,l)=>l.bindPopup('<b>'+escapeHtml(f.properties.name)+'</b><br>Źródło: BfN. Sprawdź lokalne zasady dostępu i zbioru.')}).addTo(reserveGroup);
     }
     window.__germanProtectionV253={official:result.features.length,failed:result.failed,complete:result.complete};
     setSourceState('reserve',result.ok?'ok':'error',`BfN: ${result.features.length} obszarów NSG/Nationalpark${result.ok?'':' • niepełne pobieranie, OSM jako uzupełnienie'}. Sprawdź lokalne zasady.`);
   }).catch(e=>setSourceState('reserve','error','BfN niedostępne; OSM ma niepełne pokrycie ochrony')));
   ds.textContent=`${forest.length} lasów • OSM`;ds.className='st-warn';
   run('terrain',loadTerrain,()=>terrainReady,'Wysokość terenu DEM');
   run('open',loadOpenHabitats,()=>openReady,'Łąki i polany OpenStreetMap');
   run('soil',loadSoilGrid,()=>soilReady,'Gleba SoilGrids — jeśli dostępna');
   run('obs',async()=>{
     const type=await ensureActiveSingleSpeciesObservations();
     if(!type)setSourceState('obs','off','Wybierz jeden gatunek, aby pobrać obserwacje');
   },()=>!!activeSingleSpeciesType()&&!!obsLoaded[activeSingleSpeciesType()],'Obserwacje iNaturalist i GBIF');
   await Promise.allSettled(work);
   deApplyProtectionV253(allFeatures,reserves);
   if(!activeSingleSpeciesType())setSourceState('obs','off','Wybierz jeden gatunek, aby pobrać obserwacje');
   deferSecondaryRenders=false;analysisScoringReady=true;
   invalidateScoringCaches('Germany OSM complete');render();
   if(centerWeather)updateWeatherCard();
   st.textContent=`${forestCount} obszarów leśnych; dane drzew DLR dla ${window.__germanTreesV253?.covered||0}. ${limitation}`;
 }catch(e){
   await Promise.allSettled(work);
   analysisScoringReady=false;deferSecondaryRenders=false;
   topGroup.clearLayers();hintGroup.clearLayers();topSpots=[];
   setSourceState('forest','error',String(e.message||e));
   ds.textContent='OSM niedostępne';ds.className='st-warn';
   st.textContent='Nie udało się ukończyć analizy Niemiec: '+String(e.message||e);
 }finally{hideAnalysisLoader();st.classList.remove('scoring-wait');}
}
