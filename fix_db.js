const fs = require('fs');
let src = fs.readFileSync('db.mjs', 'utf8');
src = src.replace(/\\\`/g, '\`');
src = src.replace(/\\\$/g, '$');
fs.writeFileSync('db.mjs', src);
console.log('Fixed db.mjs backticks');
