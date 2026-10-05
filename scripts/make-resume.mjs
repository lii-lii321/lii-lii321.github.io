/**
 * 生成占位简历 PDF → public/resume.pdf（零依赖，手写最小合法 PDF，A4 单页 ASCII 文本）。
 * 用户放入正式简历后直接覆盖该文件即可。
 */
import { writeFileSync } from 'node:fs';

const A4 = [595, 842]; // pt

/** 内容流：Helvetica/Times 文本行（x y size text） */
function line(x, y, font, size, text) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${text}) Tj ET\n`;
}

const rules = [
  '0.08 w 0.08 0.08 0.10 RG 80 780 m 515 780 l S\n', // 顶部粗线（墨色）
  '0.6 w 0.82 0.80 0.76 RG 80 700 m 515 700 l S\n', // 分隔细线
  '0.6 w 0.82 0.80 0.76 RG 80 520 m 515 520 l S\n',
];

const content =
  rules.join('') +
  '0.18 0.29 1 RG 5 w 80 700 m 80 780 l S\n' + // 靛蓝竖条
  line(110, 745, 'F1', 26, 'LI YUNQIANG') +
  line(112, 722, 'F2', 11, 'Data Science Major - Full-stack / AI Application Developer') +
  line(100, 668, 'F2', 12, 'PLACEHOLDER RESUME - replace public/resume.pdf with your real CV.') +
  line(100, 480, 'F2', 10, 'GITHUB   github.com/lii-lii321') +
  line(100, 460, 'F2', 10, 'EMAIL    3028410005@qq.com') +
  line(100, 440, 'F2', 10, 'SITE     lii-lii321.github.io') +
  line(100, 400, 'F2', 10, 'PROJECTS Math_Tutor_RAG / smart_tutor / research-lab / Traveling');

const objs = [];
objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
objs[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4[0]} ${A4[1]}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`;
objs[4] = `<< /Length ${content.length} >>\nstream\n${content}endstream`;
objs[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>';
objs[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (let i = 1; i < objs.length; i++) {
  offsets[i] = pdf.length;
  pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
}
const xrefPos = pdf.length;
pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
for (let i = 1; i < objs.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

writeFileSync(new URL('../public/resume.pdf', import.meta.url), pdf, 'latin1');
console.log('[resume] public/resume.pdf 占位已生成（', pdf.length, 'bytes ）');
