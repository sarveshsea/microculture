"""Verify bundled fragments directly against preserved versioned GenBank records."""
import pathlib,json,hashlib,re
root=pathlib.Path(__file__).resolve().parents[1]
entries=json.loads((root/'data/sources.json').read_text())
assert len(entries)==25
for entry in entries:
 for ref in entry['references']:
  record=(root/'data'/f"{ref['accession']}.gb").read_text()
  assert hashlib.sha256(record.encode()).hexdigest()==ref['recordChecksum']
  assert re.search(r'^VERSION\s+(\S+)',record,re.M)[1]==ref['accession']
  dna=''.join(re.findall('[acgt]+',record.split('ORIGIN')[1].split('//')[0])).upper()
  fragment=dna[ref['start']-1:ref['end']]
  if ref['strand']==-1:fragment=fragment.translate(str.maketrans('ACGT','TGCA'))[::-1]
  assert fragment==ref['sequence']
  assert hashlib.sha256(fragment.encode()).hexdigest()==ref['checksum']
  assert ref['featureStart']<=ref['start']<=ref['end']<=ref['featureEnd']
  assert len(fragment)==384
  features=re.split(r'\n     (?=\S)',record.split('FEATURES')[1].split('ORIGIN')[0])
  if ref['translationTable'] is not None:
   location=f"{ref['featureStart']}..{ref['featureEnd']}"
   feature=next(f for f in features if f.startswith('CDS') and location in f)
   table=re.search(r'/transl_table=(\d+)',feature)
   assert ref['translationTable']==(int(table[1]) if table else 1)
   codon_start=re.search(r'/codon_start=(\d+)',feature)
   assert not codon_start or int(codon_start[1])==1
   assert bool(feature.split('\n')[0].find('complement')>=0)==(ref['strand']==-1)
  else:assert 'noncoding' in ref['feature']
print('Verified',sum(len(e['references']) for e in entries),'versioned source records and25 themes')
