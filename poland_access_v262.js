// Polish recommendation exclusions. Missing source coverage is never proof of access.
let polandAccessStatusV262={bdl:false,osm:false,bdlError:'',osmErrors:[]};
function disabledParkingInfoV264(h){
 const protectedArea=!!h?.best&&(h.best._blocked||inReserve(h.best));
 return {state:protectedArea?'warn':'unknown',label:protectedArea?'Obszar wyłączony':'Dostęp niepotwierdzony',short:protectedArea?'⛔ ochrona':'? dostęp',detail:protectedArea?'Wykryty obszar ochrony lub ograniczeń dostępu.':'Parkingi i sugestie dojazdu autem są wyłączone. Mapa nie obejmuje wszystkich zakazów wstępu. Znaki w terenie i aktualne komunikaty mają pierwszeństwo.',roadKm:Infinity,parkingKm:Infinity,protected:protectedArea};
}
function polandProtectionDetailV263(){
 const s=polandAccessStatusV262;
 if(s.bdl&&s.osm)return 'Ochrona BDL i wykluczenia OSM załadowane';
 if(s.bdl)return 'Częściowe dane: ochrona BDL działa; wykluczenia OSM niedostępne. Sprawdź aktualne zakazy.';
 if(s.osm)return 'Częściowe dane: wykluczenia OSM działają; rezerwaty BDL niedostępne. Sprawdź aktualne zakazy.';
 return 'Ochrona BDL i OSM niedostępna. Brak danych nie potwierdza prawa wejścia ani zbioru.';
}
function explicitForestRestrictionV262(properties){
 const p=properties||{};
 if(['no','private'].includes(String(p.access||'').toLowerCase())||String(p.landuse||'').toLowerCase()==='military'||p.military)return 'Zakaz dostępu / teren wojskowy';
 // Use explicit descriptive fields only; undocumented inventory codes are not interpreted.
 const label=[p.restriction_reason,p.access_restriction,p.sub_area_type_name,p.forest_func_name,p.prot_category_name].filter(Boolean).join(' ').toLowerCase();
 if(/ostoja zwierząt|ostoje zwierząt|powierzchnia doświadczalna|powierzchnie doświadczalne|drzewostan nasienny|drzewostany nasienne/.test(label))return 'Ostoja / powierzchnia doświadczalna / drzewostan nasienny';
 return '';
}
async function loadPolishAccessAreasV262(){
 const rows=await Promise.allSettled(analysisBboxes().map(async bb=>{
  const bounds=[bb[1],bb[0],bb[3],bb[2]].join(',');
  const query=`[out:json][timeout:25];(nwr[landuse=military](${bounds});nwr[military](${bounds});nwr[boundary=national_park](${bounds});nwr[leisure=nature_reserve](${bounds});nwr[landuse=forest][access~"^(no|private)$"](${bounds});nwr[natural=wood][access~"^(no|private)$"](${bounds}););out body geom;`;
  // Protection must not be skipped because an unrelated optional OSM layer failed.
  const data=await fetchOverpassWithFallback('data='+encodeURIComponent(query),{optional:false,useCircuit:false});
  if(data.remark)throw new Error('Niepełna odpowiedź OSM');
  return osmtogeojson(data,{flatProperties:true}).features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type)&&!f.properties?.tainted);
 }));
 const seen=new Set();let count=0;
 for(const row of rows){if(row.status!=='fulfilled')continue;for(const f of row.value){
  if(!blanketProtectionExclusionV270(f.properties)||seen.has(f.id))continue;seen.add(f.id);f._src='osm-pl-access';f._fastBBox=geometryFastBBox(f.geometry);reserves.push(f);count++;
  if(!analysisHeadlessBatchMode)L.geoJSON(f,{style:{color:'#ff334f',weight:2,fillOpacity:.12,dashArray:'7 5'},onEachFeature:(ft,l)=>l.bindPopup('<b>'+escapeHtml(ft.properties?.name||'Obszar wyłączony z rekomendacji')+'</b><br>Źródło: OpenStreetMap. Sprawdź aktualne zasady dostępu.')}).addTo(reserveGroup);
 }}
 polandAccessStatusV262.osm=rows.every(r=>r.status==='fulfilled');
 polandAccessStatusV262.osmErrors=rows.filter(r=>r.status==='rejected').map(r=>String(r.reason?.message||r.reason));
 return {complete:polandAccessStatusV262.osm,count};
}

// Landscape parks and Natura 2000 do not imply a blanket collection ban.
function blanketProtectionExclusionV270(p){
 p=p||{};
 if(explicitForestRestrictionV262(p))return true;
 const names=[p.name,p.nazwa,p.NAME,p.NAZWA,p.designation,p.protection_title,p["protection_title:pl"]].filter(Boolean).join(' ').toLowerCase();
 if(/park.*krajobrazow|landscape park|użytek ekologiczny|environmental use|natura.?2000|obszar chronionego krajobrazu/.test(names)||['5','19'].includes(String(p.protect_class)))return false;
 return true;
}
