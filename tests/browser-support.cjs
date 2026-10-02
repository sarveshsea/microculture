const fs=require('node:fs'),path=require('node:path');
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const launchOptions=fs.existsSync(chrome)?{executablePath:chrome}:{};
const appURL=()=>process.env.BASE_URL||'file://'+path.join(__dirname,'..','index.html');
module.exports={launchOptions,appURL};
