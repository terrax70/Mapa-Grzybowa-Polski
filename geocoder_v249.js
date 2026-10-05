/* Explicit-submit Photon geocoder for static hosting.
 * Public service policy: https://github.com/komoot/photon#demo-server
 * Configure another Photon-compatible endpoint through MAP_GEOCODER_BASE_URL.
 * No coordinates or queries are persisted to disk/localStorage.
 */
(function(global){
 'use strict';
 const base=String(global.MAP_GEOCODER_BASE_URL||'https://photon.komoot.io').replace(/\/$/,'');
 const cache=new Map();
 let queue=Promise.resolve(),nextRequest=0;
 const aborted=()=>new DOMException('Anulowano wyszukiwanie','AbortError');
 function normalize(data){
   if(!Array.isArray(data?.features))throw new Error('Nieprawidłowa odpowiedź wyszukiwarki');
   return data.features.flatMap(f=>{
     const p=f.properties||{},c=f.geometry?.coordinates;
     if(!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1]))return [];
     const countryCode=String(p.countrycode||'').toUpperCase();
     if(!countryCode==='PL')return [];
     const street=[p.street,p.housenumber].filter(Boolean).join(' ');
     const parts=[...new Set([p.name,street,p.postcode,p.city||p.town||p.village,p.county,p.state,p.country].filter(Boolean))];
     if(!parts.length)return [];
     return [{lat:c[1],lon:c[0],countryCode,display_name:parts.join(', '),detail:parts.slice(1).join(', ')}];
   });
 }
 function request(route,params,{signal}={}){
   const url=base+route+'?'+new URLSearchParams(params);
   const job=queue.catch(()=>{}).then(async()=>{
     if(signal?.aborted)throw aborted();
     const hit=cache.get(url);
     if(hit&&Date.now()-hit.at<15*60*1000)return hit.rows;
     const wait=nextRequest-Date.now();
     if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
     if(signal?.aborted)throw aborted();
     nextRequest=Date.now()+1100;
     const controller=new AbortController();
     const cancel=()=>controller.abort();
     signal?.addEventListener('abort',cancel,{once:true});
     const timeout=setTimeout(()=>controller.abort(),4000);
     try{
       const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
       if(!response.ok){
         if(response.status===429)nextRequest=Date.now()+60000;
         throw new Error('Wyszukiwarka: HTTP '+response.status);
       }
       const rows=normalize(await response.json());
       if(signal?.aborted)throw aborted();
       cache.set(url,{at:Date.now(),rows});
       while(cache.size>100)cache.delete(cache.keys().next().value);
       return rows;
     }catch(e){
       if(signal?.aborted)throw aborted();
       if(e.name==='AbortError')throw new Error('Przekroczono czas odpowiedzi wyszukiwarki');
       throw e;
     }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
   });
   queue=job.catch(()=>{});
   return job;
 }
 async function townFallback(q,{signal}={}){
   if(signal?.aborted)throw aborted();
   const controller=new AbortController(),cancel=()=>controller.abort();
   signal?.addEventListener('abort',cancel,{once:true});
   const timer=setTimeout(cancel,5000);
   try{
     const url='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:q.trim(),count:'8',language:'pl',format:'json',countryCode:'PL'});
     const r=await fetch(url,{signal:controller.signal});
     if(!r.ok)throw new Error('Zapasowa wyszukiwarka: HTTP '+r.status);
     const data=await r.json();
     if(signal?.aborted)throw aborted();
     return (data.results||[]).filter(x=>x.country_code==='PL'&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)).slice(0,8).map(x=>({lat:x.latitude,lon:x.longitude,countryCode:x.country_code,display_name:[x.name,x.admin1,x.country].filter(Boolean).join(', '),detail:'Miejscowość — Open-Meteo / GeoNames (wyszukiwanie zapasowe)'}));
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 global.mapGeocoderV249={
   search:async(q,options={})=>{
     try{const rows=await townFallback(q,options);if(rows.length)return rows;}
     catch(e){if(options.signal?.aborted||e.name==='AbortError')throw e;}
     return request('/api/',[['q',q.trim()],['limit','8'],['countrycode','PL']],options);
   },
   reverse:async(lat,lon)=>{
     const rows=await request('/reverse/',{lat:String(lat),lon:String(lon),limit:'1'});
     return rows[0]||null;
   }
 };
})(window);
