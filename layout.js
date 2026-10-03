/* Stable logical rows are independent of their animated vertical positions. */
(() => {
'use strict';
const F=Object.freeze;let current=F({version:1,seed:null,insertions:F([])});
function state(){return current;}
function checked(value){if(!value||value.version!==1||!Array.isArray(value.insertions)||value.insertions.length>10000)throw new Error('Invalid row layout');const keys=new Set();for(const item of value.insertions){if(!Number.isSafeInteger(item.at)||Math.abs(item.at)>1e8||typeof item.key!=='string'||!item.key.startsWith('insert:')||item.key.length>180||keys.has(item.key))throw new Error('Invalid inserted row');keys.add(item.key);}if(value.homeColumns!==undefined&&(!Number.isInteger(value.homeColumns)||value.homeColumns<1||value.homeColumns>20))throw new Error('Invalid home columns');if(value.seed!==null&&(!Number.isInteger(value.seed)||value.seed<0||value.seed>4294967295))throw new Error('Invalid layout seed');return F({...value,insertions:F(value.insertions.map(i=>F({...i})))});}
function restore(value){current=checked(value);return current;}
function keyAt(position,value=current){let row=position;for(let i=value.insertions.length-1;i>=0;i--){const item=value.insertions[i];if(row===item.at)return item.key;if(row>item.at)row--;}return `base:${row}`;}
function position(key,value=current){const base=/^base:(-?\d+)$/.exec(key);let row=base?Number(base[1]):null,start=0;if(row===null){const i=value.insertions.findIndex(item=>item.key===key);if(i<0)throw new Error('Unknown row');row=value.insertions[i].at;start=i+1;}for(let i=start;i<value.insertions.length;i++)if(row>=value.insertions[i].at)row++;return row;}
function insertBelow(key,newKey,value=current,seed=value.seed){return checked({...value,seed,insertions:[...value.insertions,{at:position(key,value)+1,key:newKey}]});}
globalThis.MicroLayout=F({state,restore,keyAt,position,insertBelow});
})();
