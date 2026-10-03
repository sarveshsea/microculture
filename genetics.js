/* Synthetic DNA drives an illustrative phenotype, not a real species genome.
   Standard genetic code (translation table 1), T/C/A/G codon order.
   Mapping sequence statistics to morphology is an artistic model. */
(() => {
  'use strict';
  const M=MicroModel,C=MicroColor,F=Object.freeze,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const bases='TCAG',amino='FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  const codons=F(Object.fromEntries(Array.from({length:64},(_,i)=>[
    bases[Math.floor(i/16)]+bases[Math.floor(i/4)%4]+bases[i%4],amino[i]])));
  const compiled=new Map();
  const pairs=F({A:'T',T:'A',C:'G',G:'C'});
  function validate(sequence){if(typeof sequence!=='string'||!/^[ACGT]+$/.test(sequence))throw new TypeError('DNA must contain only A, C, G, T');return sequence;}
  function complement(sequence){return [...validate(sequence)].map(base=>pairs[base]).join('');}
  function reverseComplement(sequence){return [...complement(sequence)].reverse().join('');}
  function translate(sequence,table=1){validate(sequence);const overrides={2:{ATA:'M',TGA:'W',AGA:'*',AGG:'*'},3:{ATA:'M',TGA:'W',CTT:'T',CTC:'T',CTA:'T',CTG:'T'},4:{TGA:'W'},5:{ATA:'M',TGA:'W',AGA:'S',AGG:'S'},9:{AAA:'N',TGA:'W',AGA:'S',AGG:'S'},13:{ATA:'M',TGA:'W',AGA:'G',AGG:'G'}}[table]||{};let protein='';for(let i=0;i+2<sequence.length;i+=3){const codon=sequence.slice(i,i+3);protein+=overrides[codon]||codons[codon];}return protein;}
  function fraction(sequence,pattern){return (sequence.match(pattern)||[]).length/sequence.length;}
  function occurrences(sequence,motif){let total=0;for(let i=0;i<=sequence.length-motif.length;i++)if(sequence.slice(i,i+motif.length)===motif)total++;return total;}
  function analyze(sequence){
    validate(sequence);if(sequence.length!==384)throw new RangeError('Synthetic DNA must contain 384 nucleotides');
    if(compiled.has(sequence))return compiled.get(sequence);
    const gc=fraction(sequence,/[GC]/g),regions=Array.from({length:4},(_,i)=>fraction(sequence.slice(i*96,i*96+96),/[GC]/g));
    const motifs=F({TATA:occurrences(sequence,'TATA'),CGCG:occurrences(sequence,'CGCG'),ATG:occurrences(sequence,'ATG')});
    const branching=clamp(regions[1]*.75+Math.min(1,motifs.CGCG/8)*.25);
    const longevity=clamp(regions[3]*.7+Math.min(1,motifs.TATA/8)*.3);
    const phenotype=F({sequence,complement:complement(sequence),reverseComplement:reverseComplement(sequence),
      protein:translate(sequence),gc,motifs,growthRate:.009+regions[0]*.019,
      branchingRate:.08+branching*.16,pitch:8+regions[2]*12,
      rodness:.8+regions[2]*.18,branching:.45+branching*.5,cohesion:.5+gc*.4,
      metabolism:regions[0],longevity,lifespan:38+longevity*37});
    if(compiled.size>=4096)compiled.delete(compiled.keys().next().value);
    compiled.set(sequence,phenotype);return phenotype;
  }
  function sequence(seed){
    const random=M.random(seed),sense=Object.keys(codons).filter(c=>codons[c]!=='*');
    return 'ATG'+Array.from({length:126},()=>sense[Math.floor(random()*sense.length)]).join('')+'TAA';
  }
  function fingerprint(dna){let h=2166136261;for(const base of validate(dna))h=Math.imul(h^base.charCodeAt(0),16777619);return (h>>>0).toString(16).padStart(8,'0');}
  function create(seed,pigment,reference,options={}){
    const random=M.random(seed),original=reference?validate(reference.sequence):sequence(seed),dna=[...original],operations=[];
    if(reference&&!options.preserveReference){const positions=new Set();while(positions.size<18)positions.add(Math.floor(random()*384));for(const position of [...positions].sort((a,b)=>a-b)){const from=dna[position],choices=bases.replace(from,''),to=choices[Math.floor(random()*3)];dna[position]=to;operations.push(F({kind:'substitution',position,from,to}));}}
    const generated=dna.join(''),source=reference?F({...reference}):null;
    return F({...pigment,...analyze(generated),pigmentIdentity:fingerprint(generated),pigmentAnchor:pigment.hue,translationTable:options.preserveReference&&reference?reference.translationTable:1,protein:options.preserveReference&&reference?(reference.translationTable===null?'':translate(generated,reference.translationTable||1)):translate(generated),synthetic:!(options.preserveReference&&reference),sources:F(source?[source]:[]),generationTrace:F({version:options.preserveReference?'legacy-reference-v1':'seeded-genome-v2',seed,input:reference?'reference-fragment':'seeded-codons',sourceAccessions:F(source?[source.accession]:[]),operations:F(operations),fingerprint:fingerprint(generated)})});
  }
  function crossover(a,b,seed){
    validate(a);validate(b);if(a.length!==384||b.length!==384)throw new RangeError('Crossover requires 384 nucleotide sequences');
    const r=M.random(seed),cut1=3+Math.floor(r()*125)*3,cut2=Math.min(381,cut1+3+Math.floor(r()*(381-cut1)/3)*3),parental=a.slice(0,cut1)+b.slice(cut1,cut2)+a.slice(cut2),operations=[];
    const changed=[...parental].map((base,i)=>{if(i<=2||i>=381||r()>=.006)return base;const to=bases[Math.floor(r()*4)];if(to!==base)operations.push(F({kind:'substitution',position:i,from:base,to}));return to;}).join('');
    return F({sequence:changed,cuts:F([cut1,cut2]),operations:F(operations)});
  }
  function recombine(a,b,seed){return crossover(a,b,seed).sequence;}
  function breed(a,b,seed){
    const r=M.random(seed),weight=.35+r()*.3;
    const separation=Math.abs(((a.hue-b.hue+540)%360)-180);
    const mixed=separation<55?C.blend(a,b,weight):(weight<.5?a:b);
    const hue=(mixed.hue+(r()-.5)*4+360)%360,lightness=clamp(mixed.lightness+(r()-.5)*.015,.58,.86);
    const chroma=Math.min(mixed.chroma*(.97+r()*.06),C.ceiling(lightness,hue)*.94);
    const parentalA=a.sequence||sequence(seed+11),parentalB=b.sequence||sequence(seed+29),result=crossover(parentalA,parentalB,seed+997),dna=result.sequence;
    const sources=F([...new Map([...(a.sources||[]),...(b.sources||[])].map(source=>[source.accession+':'+source.start,source])).values()]);return F({lightness,chroma,hue,...analyze(dna),pigmentIdentity:fingerprint(dna),pigmentAnchor:hue,translationTable:1,synthetic:true,sources,generationTrace:F({version:'codon-crossover-v2',seed,input:'parental-crossover',cuts:result.cuts,operations:result.operations,parentFingerprints:F([fingerprint(parentalA),fingerprint(parentalB)]),fingerprint:fingerprint(dna)})});
  }
  function mutate(genome,seed){
    const r=M.random(seed),dna=[...genome.sequence],operations=[];
    const position=3+Math.floor(r()*378),from=dna[position],choices=bases.replace(from,''),to=choices[Math.floor(r()*3)];
    dna[position]=to;operations.push(F({kind:'substitution',position,from,to}));
    const changed=dna.join(''),direction=bases.indexOf(to)-bases.indexOf(from);
    const anchor=genome.pigmentAnchor??genome.hue,relative=((genome.hue-anchor+540)%360)-180;
    const hue=(anchor+clamp(relative+direction*2.4+(position%7-3)*.3,-24,24)+360)%360;
    const lightness=clamp(genome.lightness+(to==='G'||to==='C'?.004:-.004),.6,.78);
    const chroma=Math.min(clamp(genome.chroma*(1+direction*.015),.035,.18),C.ceiling(lightness,hue)*.92);
    return F({...genome,...analyze(changed),hue,lightness,chroma,pigmentIdentity:genome.pigmentIdentity,pigmentAnchor:anchor,synthetic:true,translationTable:1,
      generationTrace:F({version:'somatic-pigment-v1',seed,input:'living-layer',operations:F(operations),parentFingerprints:F([fingerprint(genome.sequence)]),fingerprint:fingerprint(changed)})});
  }
  globalThis.MicroGenetics=F({create,analyze,translate,complement,reverseComplement,codons,recombine,breed,mutate,fingerprint,crossover,version:'seeded-genome-v2'});
})();
