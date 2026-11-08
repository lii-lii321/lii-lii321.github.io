// 临时：审计 + 产物验证（用完即删）
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
try {
  execSync('npm run audit', { stdio: 'pipe', encoding: 'utf8' });
  console.log('AUDIT_PASS');
} catch (e) {
  console.log('AUDIT_FAIL:');
  console.log(((e.stdout || '') + (e.stderr || '')).slice(-500));
}
const sd = readFileSync('dist/travel/sanxindui/index.html', 'utf8');
const sh = readFileSync('dist/travel/shanghai/index.html', 'utf8');
console.log('三星堆 79 张:', sd.includes('79') ? 'OK' : 'MISS', '| 079.webp:', sd.includes('079.webp') ? 'OK' : 'MISS');
console.log('上海 23 张:', sh.includes('23') ? 'OK' : 'MISS', '| 023.webp:', sh.includes('023.webp') ? 'OK' : 'MISS');
// 编辑器拖拽指示线进包
const css = readFileSync('dist/_astro/' + (readdirSync('dist/_astro').find((f) => f.startsWith('EditGrid') && f.endsWith('.css')) ?? ''), 'utf8').slice(0, 0);
let editorChunk = '';
for (const f of readdirSync('dist/_astro')) {
  if (!f.endsWith('.js')) continue;
  const c = readFileSync(`dist/_astro/${f}`, 'utf8');
  if (c.includes('保存并上线')) { editorChunk = f; break; }
}
const ec = readFileSync(`dist/_astro/${editorChunk}`, 'utf8');
console.log('编辑器拖拽指示线:', ec.includes('dropHint') || ec.includes('insertAt') ? 'OK' : 'MISS', '| setDragImage 居中:', ec.includes('setDragImage') ? 'OK' : 'MISS');
