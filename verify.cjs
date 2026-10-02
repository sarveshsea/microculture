/* Petri-only regression entry point. Browser checks run serially. */
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=__dirname;
const unit=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.test.cjs')).map(name=>path.join('tests',name));
const run=args=>execFileSync(process.execPath,args,{cwd:root,stdio:'inherit'});
run(['--test',...unit]);
for(const check of ['browser-navigation.cjs','browser-touch.cjs','browser-flat.cjs','browser-growth.cjs','browser-petri.cjs','browser-performance.cjs'])run([path.join('tests',check)]);
