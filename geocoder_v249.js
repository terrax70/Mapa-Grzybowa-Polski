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
     if(!['PL','DE'].includes(countryCode))return [];
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
     const timeout=setTimeout(()=>controller.abort(),12000);
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
 global.mapGeocoderV249={
   search:(q,options)=>request('/api/',[['q',q.trim()],['limit','8'],['countrycode','PL'],['countrycode','DE']],options),
   reverse:async(lat,lon)=>{
     const rows=await request('/reverse/',{lat:String(lat),lon:String(lon),limit:'1'});
     return rows[0]||null;
   }
 };
})(window);
