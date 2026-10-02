const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=vm.createContext({});
test('merge storyboard opens before transfer and commits only after settling',()=>{
 vm.runInContext(fs.readFileSync(__dirname+'/../lifecycle.js','utf8'),c);const L=c.MicroLifecycle;
 assert.equal(L.merge(.125).opening,.5);assert.equal(L.merge(.59).transfer,0);
 assert.ok(Math.abs(L.merge(1.1).transfer-.5)<1e-12);assert.equal(L.merge(1.59).reveal,0);
 assert.equal(L.merge(2.25).reveal,1);assert.equal(L.merge(2.49).complete,false);
 assert.equal(L.merge(2.5).complete,true);assert.equal(L.merge(0,true).complete,true);
});
test('finite progress is clamped and all stages preserve ordering',()=>{
 const L=c.MicroLifecycle;for(let t=-1;t<4;t+=.013){const a=L.merge(t);for(const k of ['opening','sequence','transfer','reveal','settle'])assert(a[k]>=0&&a[k]<=1);if(a.reveal>0)assert.equal(a.transfer,1);if(a.transfer>0)assert.equal(a.opening,1);}
});
