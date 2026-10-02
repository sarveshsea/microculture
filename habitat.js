/* Habitat pigments are artistic environmental families, not organism claims.
   Immutable founder pigment identities select the environment; somatic evolution
   perturbs shades locally without cycling an entire specimen through a rainbow. */
(() => {
  'use strict';
  const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
  const wrap=hue=>(hue%360+360)%360;
  // A dominant habitat, a substantial warm/cool counterpoint, and a small accent.
  // Color coverage belongs to the gallery; each specimen has only three families.
  const definitions=Object.freeze([
    ['seafoam',[165,35,95]], ['beach',[65,245,195]],
    ['coral',[25,220,55]], ['rose',[355,195,310]],
    ['sage',[145,25,75]], ['sunset',[35,245,355]],
    ['lagoon',[195,55,165]], ['terracotta',[40,280,145]]
  ].map(([name,hues])=>Object.freeze({name,hues:Object.freeze(hues)})));
  const instances=new WeakMap();
  function hash(text) {
    let value=2166136261;
    for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);
    return value>>>0;
  }
  function palette(colony) {
    if(instances.has(colony))return instances.get(colony);
    const founders=(colony.layers||[]).map(layer=>{
      const genome=layer.genome||layer;
      return genome.pigmentIdentity||genome.pigmentAnchor||genome.founderHue||0;
    });
    const identity=`${colony.uid||colony.id||'specimen'}:${colony.seed||0}:${founders.join(':')}`;
    const seed=hash(identity),definition=definitions[seed%definitions.length];
    const result=Object.freeze({name:definition.name,hues:definition.hues,seed,
      lineageOffset:(seed>>>8)%25,version:'nature-habitats-v3'});
    instances.set(colony,result);
    return result;
  }
  function pigment(colony,genome,lineage=0) {
    const habitat=palette(colony);
    const index=((Math.floor(Number.isFinite(lineage)?lineage:0)+habitat.lineageOffset)%25+25)%25;
    const family=index<13?0:index<22?1:2;
    const hue=Number.isFinite(genome.hue)?genome.hue:habitat.hues[family];
    const anchor=Number.isFinite(genome.pigmentAnchor)?genome.pigmentAnchor:
      Number.isFinite(genome.founderHue)?genome.founderHue:hue;
    const delta=((hue-anchor+540)%360)-180;
    const shade=((Math.imul(index+1,2654435761)>>>0)%101)/100-.5;
    return Object.freeze({...genome,habitatHue:wrap(habitat.hues[family]+clamp(delta*.18,-5,5)+shade*4),
      habitatFamily:family,habitat:habitat.name,
      lightness:clamp((Number.isFinite(genome.lightness)?genome.lightness:.65)+shade*.045,.45,.8),
      chroma:clamp((Number.isFinite(genome.chroma)?genome.chroma:.08)+shade*.016,.03,.16)});
  }
  globalThis.MicroHabitat=Object.freeze({palette,pigment});
})();
