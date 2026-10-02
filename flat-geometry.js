/* Connected cubic paths are built before kaleidoscopic folding. */
(() => {
'use strict';
const F=Object.freeze;
function curve(segment,end,parent=null){
 const a={x:segment.x,y:segment.y},d={x:end.x,y:end.y},dx=d.x-a.x,dy=d.y-a.y,length=Math.hypot(dx,dy);
 const connected=parent&&Math.hypot(parent.xx-a.x,parent.yy-a.y)<.006;
 let tx=connected?parent.xx-parent.x:dx,ty=connected?parent.yy-parent.y:dy,n=Math.hypot(tx,ty)||1;
 if(tx*dx+ty*dy<0){tx=dx;ty=dy;n=length||1;}
 const bend=Math.min(length*.12,.003)*(segment.genome?.branching??.6),nx=-dy/(length||1),ny=dx/(length||1);
 return F({a:F(a),b:F({x:a.x+tx/n*length/3+nx*bend,y:a.y+ty/n*length/3+ny*bend}),c:F({x:d.x-dx/3+nx*bend,y:d.y-dy/3+ny*bend}),d:F(d)});
}
function sample(row,t){const u=1-t;return F({x:u*u*u*row.a.x+3*u*u*t*row.b.x+3*u*t*t*row.c.x+t*t*t*row.d.x,y:u*u*u*row.a.y+3*u*u*t*row.b.y+3*u*t*t*row.c.y+t*t*t*row.d.y});}
function fold(point,wedge){let a=((Math.atan2(point.y,point.x)%(wedge*2))+wedge*2)%(wedge*2);if(a>wedge)a=wedge*2-a;const r=Math.hypot(point.x,point.y);return F({x:Math.cos(a)*r,y:Math.sin(a)*r});}
function crossesSeam(row,wedge){const sector=Math.floor(Math.atan2(row.a.y,row.a.x)/wedge);return [row.b,row.c,row.d].some(p=>Math.floor(Math.atan2(p.y,p.x)/wedge)!==sector);}
globalThis.MicroFlatGeometry=F({curve,sample,fold,crossesSeam});
})();
