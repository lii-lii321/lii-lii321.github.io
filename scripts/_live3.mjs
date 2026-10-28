// 临时：换片轮线上验证（用完即删）
const t0 = await fetch('https://lii-lii321.github.io/travel/luoyang/');
const luoyang = await t0.text();
console.log('洛阳相册页:', t0.status, luoyang.includes('31.webp') ? '正常（31.webp 在）' : '异常');
const home = await fetch('https://lii-lii321.github.io/');
console.log('首页:', home.status, (await home.text()).includes('532') ? '数字 532 正常' : '异常');
