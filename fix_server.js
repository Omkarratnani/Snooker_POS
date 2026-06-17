const fs = require('fs');
let src = fs.readFileSync('server.mjs', 'utf8');
src = src.replace(/\\\`/g, '\`');
src = src.replace(/\\\$/g, '$');
fs.writeFileSync('server.mjs', src);
console.log('Fixed backticks in server.mjs');
