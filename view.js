(() => {
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function geometry(w,h){const columns=w<=600?3:w<=1000?4:5,rows=Math.ceil(25/columns),side=Math.min(w*.94,h*.86),gap=side/columns;return {side,gap,columns,rows,left:(w-side)/2,top:w<=600?80:(h-gap*rows)/2-12};}
function constrain(camera,w,h){return Object.freeze({zoom:clamp(camera.zoom,1,4),panX:Number.isFinite(camera.panX)?camera.panX:0,panY:Number.isFinite(camera.panY)?camera.panY:0});}
function origin(colony,w,h,camera={zoom:1,panX:0,panY:0}){const l=geometry(w,h),id=colony.id??colony.row*5+colony.col,col=colony.tileCol??id%l.columns,row=colony.tileRow??Math.floor(id/l.columns);return {x:w/2+(l.left+(col+.5)*l.gap-w/2)*camera.zoom+camera.panX,y:h/2+(l.top+(row+.5)*l.gap-h/2)*camera.zoom+camera.panY,size:l.gap*camera.zoom*colony.size};}
function boundary(colony,w,h,camera){const o=origin(colony,w,h,camera),size=o.size;return Object.freeze({x:o.x-size/2,y:o.y-size/2,size,radius:0});}
function hitTest(x,y,w,h,camera){const l=geometry(w,h),px=w/2+(x-w/2-camera.panX)/camera.zoom,py=h/2+(y-h/2-camera.panY)/camera.zoom,col=Math.floor((px-l.left)/l.gap),row=Math.floor((py-l.top)/l.gap),id=row*l.columns+col;return col>=0&&col<l.columns&&row>=0&&row<l.rows&&id<25?id:-1;}
function zoomAt(camera,zoom,point,w,h){const z=clamp(zoom,1,4),ratio=z/camera.zoom;return constrain({zoom:z,panX:point.x-w/2-(point.x-w/2-camera.panX)*ratio,panY:point.y-h/2-(point.y-h/2-camera.panY)*ratio},w,h);}
globalThis.MicroView=Object.freeze({geometry,constrain,origin,boundary,hitTest,zoomAt});
})();
