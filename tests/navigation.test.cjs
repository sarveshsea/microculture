const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const ids = new Map();
  const documentState = { activeElement:null };
  function element() {
    return { hidden:false,inert:false,dataset:{},attributes:{},events:{},
      setAttribute(key,value){this.attributes[key]=value;},
      addEventListener(key,fn){this.events[key]=fn;},
      setPointerCapture(){},focus(){this.focused=true;documentState.activeElement=this;} };
  }
  const bars = ['', 'dish-'].map(prefix => {
    const bar=element(), entries={};
    for(const key of ['.navigation-primary','.navigation-primary button','.navigation-pull','[id$="collapse"]'])entries[key]=element();
    bar.querySelector=key=>entries[key];
    bar.contains=node=>Object.values(entries).includes(node);
    for(const name of ['flat','sphere'])ids.set(prefix+name,element());
    return bar;
  });
  ids.set('dish',element());ids.set('code-toggle',element());
  const context=vm.createContext({document:{querySelectorAll:()=>bars,getElementById:id=>ids.get(id),get activeElement(){return documentState.activeElement;}}});
  vm.runInContext(fs.readFileSync(__dirname+'/../navigation.js','utf8')+';globalThis.navigation=MicroNavigation',context);
  return {bars,ids,navigation:context.navigation};
}
test('manual hiding synchronizes both bars and removes primary controls from tab order',()=>{
 const {bars}=setup();
 bars[1].querySelector('[id$="collapse"]').events.click();
 for(const bar of bars){assert.equal(bar.querySelector('.navigation-primary').inert,true);assert.equal(bar.querySelector('.navigation-primary').hidden,true);assert.equal(bar.querySelector('.navigation-pull').hidden,false);}
 bars[1].querySelector('.navigation-pull').events.click();
 assert.equal(bars[1].querySelector('.navigation-primary').inert,false);
 assert.equal(bars[1].querySelector('.navigation-primary button').focused,true);
});
test('upward pull restores navigation while canceled pulls stay hidden',()=>{
 const {bars}=setup();bars[0].querySelector('[id$="collapse"]').events.click();
 const pull=bars[0].querySelector('.navigation-pull');
 pull.events.pointerdown({clientY:100,pointerId:1});pull.events.pointercancel();pull.events.pointerup({clientY:75});
 assert.equal(bars[0].querySelector('.navigation-primary').hidden,true);
 pull.events.pointerdown({clientY:100,pointerId:1});pull.events.pointerup({clientY:75});
 assert.equal(bars[0].querySelector('.navigation-primary').hidden,false);
});
