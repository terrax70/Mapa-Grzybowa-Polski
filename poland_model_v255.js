/* Pure data rules shared by the Polish model and its regression tests. */
(function(root){
'use strict';
const number=v=>v===null||v===undefined||v===''?NaN:Number(v);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function curve(x,points){
 if(!Number.isFinite(x))return NaN;
 if(x<=points[0][0])return points[0][1];
 for(let i=1;i<points.length;i++)if(x<=points[i][0]){const [a,b]=points[i-1],[c,d]=points[i];return b+(d-b)*(x-a)/(c-a);}
 return points.at(-1)[1];
}
function localTime(now,zone='Europe/Warsaw'){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function parseWeather(j,name,lat,lon,allowFuture=true,{now=new Date()}={}){
 const times=j.hourly?.time||[],hourly=j.hourly||{},clock=localTime(now,j.timezone||'UTC');
 const cutoff=j.current?.time&&j.current.time<clock?j.current.time:clock;
 let end=-1;for(let i=0;i<times.length;i++)if(times[i]<=cutoff)end=i;
 if(end<0)throw new Error('Pogoda: brak ukończonych godzin historycznych');
 const timestamp=t=>Date.parse(t+'Z'); // local wall-clock axis; never mix local and UTC strings
 const ageHours=(timestamp(clock)-timestamp(times[end]))/3600000;
 if(ageHours>48)throw new Error('Pogoda: ostatnie dane są starsze niż 48 godzin');
 const coverage={};
 const values=(key,h,forward=false)=>{
   const rows=[];const anchor=timestamp(times[end]);
   for(let i=forward?end+1:Math.max(0,end-h+1);i<(forward?Math.min(times.length,end+h+1):end+1);i++){
     const delta=(timestamp(times[i])-anchor)/3600000;
     if(forward?(delta>0&&delta<=h):(delta<=0&&delta>-h))rows.push(number(hourly[key]?.[i]));
   }
   const valid=rows.filter(Number.isFinite);coverage[key+'_'+h+(forward?'_future':'')]=Math.min(1,valid.length/h);
   return {valid,complete:valid.length===h,coverage:Math.min(1,valid.length/h)};
 };
 const total=(key,h,forward=false)=>{const v=values(key,h,forward);return v.complete?v.valid.reduce((a,b)=>a+b,0):NaN;};
 const mean=(key,h)=>{const v=values(key,h);return v.coverage>=.8?v.valid.reduce((a,b)=>a+b,0)/v.valid.length:NaN;};
 const rain7=total('precipitation',168),rain14=total('precipitation',336),rain21=total('precipitation',504),rain28=total('precipitation',672);
 const soilM=mean('soil_moisture_9_to_27cm',24),soilT=mean('soil_temperature_6cm',24),rh=mean('relative_humidity_2m',24),vpd=mean('vapour_pressure_deficit',24),airT=mean('temperature_2m',168),et7=total('et0_fao_evapotranspiration',168);
 const temps=values('temperature_2m',168);let nightMin=NaN;
 if(temps.coverage>=.8){const night=[];for(let i=Math.max(0,end-167);i<=end;i++){const hour=['UTC','GMT','Etc/UTC'].includes(j.timezone||'UTC')?Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Warsaw',hour:'2-digit',hourCycle:'h23'}).format(new Date(times[i]+'Z'))):Number(times[i].slice(11,13)),v=number(hourly.temperature_2m?.[i]);if(Number.isFinite(v)&&(hour<=6||hour>=22))night.push(v);}if(night.length)nightMin=Math.min(...night);}
 let dryDays=0;
 for(let d=0;d<28;d++){const start=end-d*24-23;if(start<0){dryDays=NaN;break;}const rows=hourly.precipitation?.slice(start,end-d*24+1).map(number)||[];if(rows.length!==24||rows.some(v=>!Number.isFinite(v))){dryDays=NaN;break;}if(rows.reduce((a,b)=>a+b,0)<.5)dryDays++;else break;}
 const week=x=>curve(x,[[0,8],[2,22],[5,42],[10,68],[20,90],[35,100],[65,90]]);
 const rainScore=.34*week(rain7)+.29*week(rain14-rain7)+.22*week(rain21-rain14)+.15*week(rain28-rain21);
 const temp=Number.isFinite(soilT)?curve(soilT,[[0,8],[4,28],[8,62],[11,82],[14,100],[18,96],[21,78],[25,45],[30,12]]):curve(airT,[[4,30],[9,65],[14,95],[20,80],[27,35]]);
 if(!Number.isFinite(rainScore)||!Number.isFinite(temp))throw new Error('Pogoda: niepełna historia opadu lub temperatury; ocena DZIŚ niedostępna');
 const components=[[rainScore,.30],[temp,.20],[curve(soilM,[[.08,10],[.12,28],[.16,50],[.20,72],[.25,90],[.32,100],[.42,92]]),.34],[Number.isFinite(vpd)?curve(vpd,[[0,100],[.35,96],[.7,82],[1.1,62],[1.6,40],[2.2,20],[3,8]]):curve(rh,[[35,25],[50,45],[65,70],[80,90],[95,100]]),.16]].filter(([v])=>Number.isFinite(v));
 const weight=components.reduce((a,[,w])=>a+w,0);
 const balance=Number.isFinite(et7)?curve(rain7-et7,[[-25,-10],[-10,-5],[-2,0],[5,4],[15,7],[30,5]]):0;
 const dry=Number.isFinite(dryDays)?curve(dryDays,[[0,0],[3,0],[5,-4],[8,-10],[12,-18],[20,-28]]):0;
 const index=clamp(components.reduce((a,[v,w])=>a+v*w,0)/weight+balance+dry,0,100);
 return {name,lat,lon,index,rain7,rain14,rain21,rain28,soilM,soilT,rh,vpd,et7,dryDays,nightMin,future3:allowFuture?total('precipitation',72,true):NaN,current:j.current||null,coverage,partial:weight<.999||!Number.isFinite(et7)||!Number.isFinite(nightMin),dataTime:times[end],ageHours};
}
function weatherPoints(center,radiusKm){
 const out=[center.slice()],r=Math.max(.1,number(radiusKm)||1);
 if(r<=3)return out;
 const rings=r>20?[.4,.85]:[.75];
 for(const fraction of rings)for(let i=0;i<8;i++){const a=i*Math.PI/4,d=r*fraction;out.push([center[0]+d*Math.cos(a)/111.32,center[1]+d*Math.sin(a)/(111.32*Math.cos(center[0]*Math.PI/180))]);}
 return out;
}
function hostMatch(profile,strong,secondary){
 strong=new Set(strong||[]);secondary=new Set(secondary||[]);
 const rows=(profile||[]).filter(r=>strong.has(r.tree)||secondary.has(r.tree));
 if(!rows.length)return null;
 let amount=0,strongAmount=0,total=0,ageSum=0,ageWeight=0,best=null;
 const denominator=Math.max(1,(profile||[]).reduce((a,r)=>a+Math.max(0,number(r.share)||0),0));
 for(const row of rows){const share=clamp(number(row.share)||0,0,1)/denominator,isStrong=strong.has(row.tree),w=share*(isStrong?1:.65);amount+=w;total+=share;if(isStrong)strongAmount+=share;if(number(row.age)>0){ageSum+=number(row.age)*w;ageWeight+=w;}if(!best||w>best.weight)best={row,weight:w};}
 return {kind:strongAmount>0?'strong':'secondary',row:best.row,share:clamp(amount,0,1),hostShare:clamp(total,0,1),age:ageWeight?ageSum/ageWeight:NaN,ageCoverage:amount?ageWeight/amount:0,shareKnown:!rows.some(r=>r.inferred)};
}
function treeScore(match,wood=false){return match?(match.shareKnown===false?6.5:(wood?4.2:2.5)+(9.7-(wood?4.2:2.5))*Math.sqrt(match.share)):(wood?4.2:2.5);}
function hostGate(match,strict=false){return match?(match.shareKnown===false?(strict?.5:.65):(strict?.04:.20)+(strict?.96:.80)*Math.sqrt(match.share)):NaN;}
function soilReliability(sample){
 if(!sample)return 0;
 const coverage=Number.isFinite(sample._soilCoverageReliability)?sample._soilCoverageReliability:(number(sample._soilReliability)||0);
 const low=number(sample.phLow),high=number(sample.phHigh);
 const uncertainty=Number.isFinite(low)&&Number.isFinite(high)&&high>=low?1/(1+high-low):.5;
 return clamp(coverage,0,1)*uncertainty;
}
const api={number,curve,parseWeather,weatherPoints,hostMatch,treeScore,hostGate,soilReliability};
root.PolandModelV255=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
