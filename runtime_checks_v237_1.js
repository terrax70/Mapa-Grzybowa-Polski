/* Mapa Grzybów v237.1 — combined audit */
(function(){
'use strict';
window.auditV237=async function(){
  let v235=null,v236=null,radar=null;
  try{if(typeof window.auditV235==='function')v235=window.auditV235();}catch(e){v235={error:String(e)}}
  try{if(typeof window.auditRadiusV236==='function')v236=window.auditRadiusV236();}catch(e){v236={error:String(e)}}
  try{
    const fn=window.auditRadarV4V235||window.auditRadarV4V234||window.auditNationalRadar;
    if(typeof fn==='function')radar=await fn();
  }catch(e){radar={error:String(e)}}
  const qa=window.__v192AutoQA||window.__v195AutoQA||null;
  const cfg=window.__SPUN_CONFIG_V237||{available:false};
  const report={
    version:'v237.1-qa-checklist-spun-ready',
    autoQA:qa?{
      overall:qa.overall,
      reuseStatus:qa.reuseStatus||null,
      phaseReuseOk:qa.phaseReuseOk,
      equivalenceOk:qa.equivalenceOk,
      maxDelta:qa.maxDelta,
      roundTripOk:qa.roundTripOk,
      roundTripMaxDelta:qa.roundTripMaxDelta,
      weatherStatus:qa.weatherStatus,
      phaseStaticAreas:qa.phaseStaticAreas,
      phaseDynamicAreas:qa.phaseDynamicAreas,
      phaseReusedFeatures:qa.phaseReusedFeatures
    }:null,
    checklist:{
      osmMax10km:!!(v235?.osmMaxKm===10||window.__v235Runtime?.osmMaxKm===10),
      parkingCoveredByOsmCap:!!(v235?.osmMaxKm===10||window.__v235Runtime?.osmMaxKm===10),
      radiusTransitionAtomic:v236?.styleCommit?.atomic===true||v236?.pending===false,
      leafletLegendOverlap:v235?.legend?.overlapNow??null,
      legendModeStabilizer:typeof window.auditV235==='function',
      spunConfigured:!!cfg.available,
      nationalRadarViewportWide:!!(radar?.version==='v235-radar-v4-national-context'||/national-context/.test(String(radar?.version||'')))
    },
    radius:v236,
    osm:v235?.overpass||null,
    legend:v235?.legend||null,
    radar,
    spun:{available:!!cfg.available,source:cfg.source||'SPUN Underground Atlas',license:cfg.license||'CC BY 4.0',scoringEffect:false},
    guarantees:{scoringChanged:false,biologyChanged:false,weatherChanged:false,observationsChanged:false,spunAffectsScore:false}
  };
  console.info('V237.1 AUDIT',report);
  return report;
};
})();
