import fs from 'node:fs';
const c = fs.readFileSync('check.log', 'utf8');
const t = fs.readFileSync('test.log', 'utf8');
const b = fs.readFileSync('build.log', 'utf8');
console.log('check:', (c.match(/(\d+) errors?/) || [])[1], 'errors');
console.log('test:', (t.match(/pass (\d+)/) || [])[1], 'pass /', (t.match(/fail (\d+)/) || [])[1], 'fail');
console.log('build:', (b.match(/(\d+) page\(s\)/) || [])[1], 'pages,', b.includes('Complete!') ? 'Complete' : 'INCOMPLETE');
const errs = b.split(/\r?\n/).filter((l) => /error|Error/i.test(l));
if (errs.length) console.log('BUILD ERRORS:\n' + errs.slice(0, 10).join('\n'));
