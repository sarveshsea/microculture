const {execFileSync}=require('node:child_process'),path=require('node:path');
for(const file of ['browser-navigation.cjs','browser-touch.cjs','browser-flat.cjs','browser-growth.cjs','browser-petri.cjs','browser-performance.cjs'])execFileSync(process.execPath,[path.join(__dirname,'..','tests',file)],{stdio:'inherit'});
