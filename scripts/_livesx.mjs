// 临时：线上验证山西册（用完即删）
const check = async (path) => {
  try {
    const r = await fetch(`https://lii-lii321.github.io${path}`, { method: 'HEAD' });
    console.log(`${r.status}  ${path}`);
    return r.status;
  } catch (e) {
    console.log(`FETCH_FAIL ${path}: ${e.cause?.message ?? e.message}`);
    return 0;
  }
};
const st = await check('/travel/shanxi-huashan/');
if (st === 200) {
  const html = await (await fetch('https://lii-lii321.github.io/travel/shanxi-huashan/')).text();
  console.log('新标题:', html.includes('晋陕之行：华山 · 太原 · 大同') ? 'OK' : 'MISS');
  console.log('三景分组:', ['华山', '太原', '大同'].every((k) => html.includes(k)) ? 'OK' : 'MISS');
  console.log('403 张:', html.includes('403') ? 'OK' : 'MISS');
  await check('/photos/shanxi-huashan/thumbs/403.webp');
}
