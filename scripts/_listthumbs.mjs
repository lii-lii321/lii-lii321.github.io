// 临时：列山西缩略图 001/002 档位（用完即删）
import { readdirSync } from 'node:fs';
const all = readdirSync('photos/shanxi-huashan/thumbs').filter((f) => f.startsWith('001') || f.startsWith('002'));
console.log(all.join('\n') || '无');
console.log('总 thumbs 数:', readdirSync('photos/shanxi-huashan/thumbs').length);
