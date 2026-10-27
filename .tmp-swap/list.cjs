const fs = require('fs');

// 1) station photos
const dir = 'D:/My_Project/Traveling/public/photos/sanxindui';
const files = fs.readdirSync(dir).sort();
console.log('STATION FILES (' + files.length + '):');
console.log(files.join('\n'));

// 2) album.json
const j = JSON.parse(fs.readFileSync('D:/My_Project/Traveling/photos/sanxindui/album.json', 'utf8'));
console.log('--- album.json ---');
console.log('top keys:', Object.keys(j));
console.log('cover:', JSON.stringify(j.cover));
const ph = j.photos || j.items || [];
console.log('photo count:', ph.length);
if (ph.length) console.log('first entry:', JSON.stringify(ph[0], null, 1));
