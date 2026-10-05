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
   if(!place){locatorHint.textContent='Wybierz punkt w Polsce.';return;}
   addDraft(cleanPlaceName(place.display_name)||name,lat,lon,place.countryCode);
 }catch(e){locatorHint.textContent='Nie udało się ustalić kraju. Wyszukaj adres lub spróbuj ponownie.';}
}

async function mainGermanyV252(){throw new Error('Obsługa Niemiec jest wyłączona.');}
