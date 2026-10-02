(() => {
  'use strict';
  const F=Object.freeze;
  const themes=F(["Rabbit","Frog","Axolotl","Zebrafish","Mouse","Butterfly","Octopus","Honeybee","Orchid","Fern","Coral","Yeast","Moss","Firefly","Sea urchin","Silkworm","Diatom","Jellyfish","Beetle","Salamander","Dragonfly","Anemone","Sunflower","Lichen","Nautilus"]);
  function describe(colony,layerId=0){
    const layer=colony.layers[Math.max(0,Math.min(colony.layers.length-1,Math.floor(layerId)))];
    const genome=layer.genome;
    const source=colony.derivation?null:globalThis.MicroSources?.theme(colony),theme=colony.derivation?'Offspring':source?.theme||themes[(colony.specimenIndex??colony.id)%themes.length];
    return F({...genome,referenceCatalog:source,layerId:layer.id,seed:layer.seed,theme,species:`${theme} · ${genome.synthetic===false?'reference fragment':'synthetic'} ${String(layer.id+1).padStart(2,'0')}`,
      specimenUID:colony.uid||`reference-${colony.seed}-${colony.specimenIndex??colony.id}`,genomicGeneration:colony.genomicGeneration??(colony.derivation?1:0),ancestry:colony.ancestry||[],algorithm:colony.derivation?.algorithm||genome.generationTrace?.version||'legacy-preserved-v1',topologyVersion:colony.derivation?.topologyVersion||colony.generationTrace?.version||'legacy-topology-v1',illustrative:true,sectors:3+(colony.specimenIndex??colony.id)%5,population:layer.population,activity:layer.activity,
      diffusion:.12+((colony.specimenIndex??colony.id)%4)*.025,feed:.026+((colony.specimenIndex??colony.id)%6)*.002,kill:.052+((colony.specimenIndex??colony.id)%5)*.002});
  }
  function lines(sequence,width){return Array.from({length:Math.ceil(sequence.length/width)},(_,i)=>sequence.slice(i*width,(i+1)*width)).join('\n');}
  function code(colony,layerId=0){
    const d=describe(colony,layerId);
    const field=globalThis.MicroSequenceField&&colony.layers.every(layer=>layer.genome.sequence?.length===384)?MicroSequenceField.create(colony):null;
    const references=(d.sources||d.referenceCatalog?.references||[]).map(r=>`// ${r.species} · ${r.accession}\n// ${r.feature} ${r.start}..${r.end} strand ${r.strand} · table ${r.translationTable}\n// ${r.sourceUrl}\n// SHA256 ${r.checksum}`).join('\n');
    const trace=d.generationTrace,traceCode=trace?`\n\n// Generation trace · ${trace.version}\nseed = ${trace.seed??colony.seed}\nfingerprint = "${trace.fingerprint}"\n${trace.cuts?`crossover = [${trace.cuts.join(', ')}]\n`:''}substitutions = ${JSON.stringify(trace.operations||[],null,2)}`:'';
    return `// ${d.synthetic===false?'Verified reference fragment':'Illustrative synthetic DNA'} · layer ${d.layerId+1}\n// Sequence-derived artistic phenotype · not a viable hybrid genome\n${references}${traceCode}\n\nspecimen_uid = "${d.specimenUID}"\ngenomic_generation = ${d.genomicGeneration}\nbiological_generation = ${colony.generation}\nancestry = ${JSON.stringify(d.ancestry,null,2)}\ngenome_algorithm = "${d.algorithm}"\ntopology_algorithm = "${d.topologyVersion}"\n\nlayers = 25\nderived_sequences = ${field?.count||0}\nsequence_field_algorithm = "${field?.version||'legacy'}"\n${field?`field_seed = ${field.seed}\nsynthetic_field_sample = "${field.sequence(d.layerId)}"\n`: ''}\ncoupling = "nutrients + competition + fusion"\n\n5′ DNA\n${lines(d.sequence,48)} 3′\n\n3′ Complement\n${lines(d.complement,48)} 5′\n\nTranslation · ${d.translationTable===null?'not applicable (noncoding fragment)':'code table '+(d.translationTable||1)}\n${lines(d.protein,32)}\n\nGC ${(d.gc*100).toFixed(1)}% · ${d.sequence.length} nt\nTATA ${d.motifs.TATA} · CGCG ${d.motifs.CGCG}\n\ngrowth = ${d.growthRate.toFixed(5)}\nbranching = ${d.branchingRate.toFixed(4)}\nhelix_pitch = ${d.pitch.toFixed(3)}\nlifespan = ${d.lifespan.toFixed(2)}\npopulation = ${d.population}\nactivity = ${d.activity.toFixed(3)}\n\n∂u/∂t = Dᵤ∇²u − uv² + f(1 − u)\n∂v/∂t = Dᵥ∇²v + uv² − (f + k)v`;
  }
  globalThis.MicroGenome=F({describe,code});
})();
