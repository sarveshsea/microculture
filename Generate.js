/* Generate motion adapted from the user-supplied Bencho Generate component (MIT).
   Source: https://bencho.dev/licence. Uses our existing canvas and tokens; no photo assets.
   pace=5, ripple=50; square cells preserve the prototype's borderless grid. */
(() => {
'use strict';
const defaults=Object.freeze({pace:5,ripple:50,corner:0});
const clamp=x=>Math.max(0,Math.min(1,x));
function progress(born,now,reduced=false){return reduced||born===undefined?1:clamp((now-born)/(Math.max(2,defaults.pace)*130));}
function reveal(g,bounds,t){if(t>=1)return;const strength=defaults.ripple/100*(1-t)**1.5;g.save();g.globalAlpha*=strength*.28;g.strokeStyle='oklch(.6 .025 250)';g.lineWidth=.5;const y=bounds.y+bounds.size*t;g.beginPath();g.moveTo(bounds.x+bounds.size*.1,y);g.lineTo(bounds.x+bounds.size*.9,y);g.stroke();g.restore();}
globalThis.Generate=Object.freeze({defaults,progress,reveal});
})();
