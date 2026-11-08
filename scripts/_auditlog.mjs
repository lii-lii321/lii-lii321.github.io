// 临时：审计日志尾部（用完即删）
import { readFileSync } from 'node:fs';
const t = readFileSync('audit-out.log', 'utf8');
console.log(t.slice(-900));
