/* Single offline worker: bounded FIFO work, stable recipe deduplication, immutable delivery. */
(() => {
 'use strict';
 const jobs=new Map(),queue=[];let worker=null,active=null,nextId=0,completed=0,failure=null;
 const LIMIT=72;
 function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
 function fail(error){failure=error instanceof Error?error:new Error(String(error));worker?.terminate();worker=null;for(const job of jobs.values())job.reject(failure);jobs.clear();queue.length=0;active=null;}
 function pump(){if(active||!queue.length||!worker)return;active=queue.shift();worker.postMessage({id:active.id,seed:active.seed,index:active.index,time:active.time});}
 function setup(){if(worker)return;if(failure)throw failure;const url=URL.createObjectURL(new Blob([globalThis.MicroGenerationSource],{type:'text/javascript'}));try{worker=new Worker(url);}finally{URL.revokeObjectURL(url);}worker.onmessage=event=>{const result=event.data;if(!active||result.id!==active.id)return;const job=active;active=null;jobs.delete(job.key);if(result.error)job.reject(new Error(result.error));else {completed++;job.resolve(freeze(result.colony));}pump();};worker.onerror=event=>fail(new Error(event.message||'Artwork generation worker failed'));}
 function request(seed,index=0,time=0){if(!Number.isFinite(seed)||!Number.isInteger(index)||!Number.isFinite(time))return Promise.reject(new TypeError('Generation requires finite seed, integer index, and finite time'));const key=[seed,index,time].join(':');if(jobs.has(key))return jobs.get(key).promise;if(jobs.size>=LIMIT)return Promise.reject(new RangeError('Generation queue is full'));if(typeof Worker==='undefined'){try{return Promise.resolve(freeze(MicroFungus.createColony(seed,index,time)));}catch(error){return Promise.reject(error);}}try{setup();}catch(error){fail(error);return Promise.reject(error);}let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;}),job={id:++nextId,key,seed,index,time,promise,resolve,reject};jobs.set(key,job);queue.push(job);pump();return promise;}
 function stats(){return Object.freeze({backend:typeof Worker==='undefined'?'synchronous':'worker',pending:jobs.size,queued:queue.length,active:Boolean(active),completed,error:failure?.message||null});}
 globalThis.MicroGeneration=Object.freeze({request,stats});
})();
