// Polygon intersection shared by Polish protection filters.
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
