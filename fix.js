import fs from 'fs';
let src = fs.readFileSync('src/App.jsx', 'utf8');
src = src.replace(/\\\`/g, '\`');
src = src.replace(/\\\$/g, '$');
fs.writeFileSync('src/App.jsx', src);
console.log('Fixed backticks');
