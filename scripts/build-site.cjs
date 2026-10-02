/* Publish only runtime files, never tests, reference archives, or local artifacts. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
execFileSync(process.execPath,[path.join(__dirname,'build-generation-worker.cjs')]);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const assets=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map(match=>match[1]);
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
for(const file of ['index.html',...new Set(assets)]){if(!/^[a-zA-Z0-9._-]+$/.test(file))throw new Error('Invalid runtime asset: '+file);fs.copyFileSync(path.join(root,file),path.join(out,file));}
console.log(`Built ${new Set(assets).size+1} static files.`);
