// 轮询 GitHub Actions 部署状态（有界：最多 ~9 分钟），完成后探测线上站点
import { execSync } from 'node:child_process';

const repo = 'lii-lii321/lii-lii321.github.io';
let conclusion = '';
for (let i = 0; i < 36; i++) {
  let out = '';
  try {
    out = execSync(`gh run list --repo ${repo} --limit 1 --json databaseId,status,conclusion,displayTitle`, { encoding: 'utf8' });
  } catch (e) {
    console.log('gh 调用失败，重试…', e.message);
    await new Promise((r) => setTimeout(r, 15000));
    continue;
  }
  const run = JSON.parse(out)[0] ?? {};
  console.log(`[${i * 15}s] ${run.status} ${run.conclusion ?? ''} #${run.databaseId}`);
  if (run.status === 'completed') {
    conclusion = run.conclusion ?? '';
    break;
  }
  await new Promise((r) => setTimeout(r, 15000));
}

if (conclusion === 'success') {
  // 线上探测
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('https://lii-lii321.github.io/', { redirect: 'follow' });
      console.log('LIVE', res.status, 'https://lii-lii321.github.io/');
      if (res.ok) {
        const html = await res.text();
        console.log('线上含李云强:', html.includes('李云强') ? 'yes' : 'NO');
        const t = await fetch('https://lii-lii321.github.io/travel/yunnan/');
        console.log('LIVE /travel/yunnan/', t.status);
        break;
      }
    } catch (e) {
      console.log(`[${i}] CDN 尚未就绪，15s 后重试…`);
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
} else {
  console.log('工作流最终状态:', conclusion || '未在时限内完成（可稍后 gh run list 查看）');
}
