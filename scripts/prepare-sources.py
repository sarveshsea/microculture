"""Bundle primary versioned GenBank records and contiguous annotated CDS fragments.
Network preparation only; runtime uses the embedded immutable catalog.
"""
import urllib.request,urllib.parse,json,re,time,hashlib,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
THEMES=[('Rabbit','Oryctolagus cuniculus','rabbit'),('Frog','Xenopus tropicalis','frog'),('Axolotl','Ambystoma mexicanum','salamander'),('Zebrafish','Danio rerio','fish'),('Mouse','Mus musculus','mouse'),('Butterfly','Danaus plexippus','butterfly'),('Octopus','Octopus bimaculoides','octopus'),('Honeybee','Apis mellifera','bee'),('Orchid','Phalaenopsis equestris','flower'),('Fern','Adiantum capillus-veneris','fern'),('Coral','Acropora digitifera','coral'),('Yeast','Saccharomyces cerevisiae','yeast'),('Moss','Physcomitrium patens','moss'),('Firefly','Photinus pyralis','beetle'),('Sea urchin','Strongylocentrotus purpuratus','urchin'),('Silkworm','Bombyx mori','moth'),('Diatom','Phaeodactylum tricornutum','diatom'),('Jellyfish','Aurelia aurita','jellyfish'),('Beetle','Tribolium castaneum','beetle'),('Salamander','Ambystoma tigrinum','salamander'),('Dragonfly','Anax imperator','dragonfly'),('Anemone','Anemonia viridis','anemone'),('Sunflower','Helianthus annuus','flower'),('Lichen',['Cladonia grayi','Asterochloris glomerata'],'lichen'),('Nautilus','Nautilus macromphalus','nautilus')]
def request(kind,args):
 time.sleep(.36)
 url='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'+kind+'.fcgi?'+urllib.parse.urlencode(args)
 for attempt in range(5):
  try:return urllib.request.urlopen(url,timeout=45).read().decode()
  except Exception:
   if attempt==4:raise
   time.sleep(2+attempt)
def fetch(species):
 term=f'"{species}"[Organism] AND (mitochondrion[Title] OR chloroplast[Title]) AND complete genome[Title]'
 search=json.loads(request('esearch',{'db':'nuccore','term':term,'retmode':'json','retmax':30}))['esearchresult']['idlist']
 if not search:search=json.loads(request('esearch',{'db':'nuccore','term':f'"{species}"[Organism] AND CDS[Feature Key]','retmode':'json','retmax':30}))['esearchresult']['idlist']
 if not search:raise ValueError('No annotated record '+species)
 for uid in search:
  record=request('efetch',{'db':'nuccore','id':uid,'rettype':'gb','retmode':'text'})
  accession=re.search(r'^VERSION\s+(\S+)',record,re.M).group(1)
  organism=re.search(r'^  ORGANISM\s+(.+)',record,re.M).group(1).strip()
  if organism != species and not organism.startswith(species+' '):continue
  sequence=''.join(re.findall('[acgt]+',record.split('ORIGIN')[1].split('//')[0])).upper()
  if species=='Asterochloris glomerata' and len(sequence)>=384:
   fragment=sequence[:384]
   if re.fullmatch('[ACGT]{384}',fragment):
    (ROOT/'data'/f'{accession}.gb').write_text(record)
    return {'accession':accession,'species':species,'sourceUrl':'https://www.ncbi.nlm.nih.gov/nuccore/'+accession,'sequence':fragment,'start':1,'end':384,'strand':1,'feature':'genomic actin fragment; includes noncoding sequence','featureStart':1,'featureEnd':len(sequence),'translationTable':None,'checksum':hashlib.sha256(fragment.encode()).hexdigest(),'recordChecksum':hashlib.sha256(record.encode()).hexdigest()}
  features=re.split(r'\n     (?=\S)',record.split('FEATURES')[1].split('ORIGIN')[0])
  for feature in features:
   match=re.match(r'CDS\s+(complement\()?([0-9]+)\.\.([0-9]+)\)?',feature)
   if not match:continue
   a,b=int(match[2]),int(match[3]);strand=-1 if match[1] else 1
   if b-a+1<384:continue
   table=re.search(r'/transl_table=(\d+)',feature);table=int(table[1]) if table else 1
   if strand==1:start,end=a,a+383;fragment=sequence[start-1:end]
   else:start,end=b-383,b;fragment=sequence[start-1:end].translate(str.maketrans('ACGT','TGCA'))[::-1]
   if not re.fullmatch('[ACGT]{384}',fragment):continue
   label=re.search(r'/gene="([^"]+)"',feature) or re.search(r'/product="([^"]+)"',feature)
   path=ROOT/'data'/f'{accession}.gb';path.write_text(record)
   return {'accession':accession,'species':species,'sourceUrl':'https://www.ncbi.nlm.nih.gov/nuccore/'+accession,'sequence':fragment,'start':start,'end':end,'strand':strand,'feature':label[1] if label else 'CDS','featureStart':a,'featureEnd':b,'translationTable':table,'checksum':hashlib.sha256(fragment.encode()).hexdigest(),'recordChecksum':hashlib.sha256(record.encode()).hexdigest()}
 raise ValueError('No suitable contiguous annotated CDS '+species)
entries=[]
cache=ROOT/'data'/'sources.json'
if cache.exists():entries=json.loads(cache.read_text())
for i,(theme,species,symbol) in enumerate(THEMES):
 if len(entries)>i:continue
 refs=[fetch(s) for s in (species if isinstance(species,list) else [species])]
 entries.append({'theme':theme,'symbol':symbol,'species':species,'references':refs})
 cache.write_text(json.dumps(entries,indent=2));print(i,theme,[r['accession'] for r in refs],flush=True)
raw=json.dumps(entries,separators=(',',':'))
(ROOT/'sources.js').write_text("/* Versioned NCBI reference fragments; see data/*.gb and scripts/verify-sources.py. */\n(() => {'use strict';const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};const entries=freeze("+raw+");function get(index){return entries[((Math.floor(index)||0)%25+25)%25];}function theme(colony){return get(colony.specimenIndex??colony.id);}globalThis.MicroSources=Object.freeze({entries,get,theme});})();\n")
