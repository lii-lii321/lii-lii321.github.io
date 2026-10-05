/**
 * 构建时抓取 GitHub 贡献热力图 → src/data/github.json（规格 §8.6.5 / §10.4）。
 *
 * 数据源优先级：
 *   1. GitHub GraphQL（设置 GITHUB_TOKEN 环境变量时）——近一年 contributionCalendar；
 *   2. 公共 contributions API（无需鉴权，限流较松）；
 *   3. 都失败 → 写入 source:"empty" 的空数据，**不阻塞构建**，页面显示诚实的空状态。
 *
 * 安全约束：仅允许 https；请求前按 host 白名单校验，
 * 显式拒绝 localhost / 环回 / 私有 / 保留地址。
 * 用户名来自 src/config/site.ts 的 githubUser 字段（已配置真实用户名）；
 * 抓取失败多为网络 / 限流问题，同样写入空数据不阻塞构建，稍后重新构建即可重试。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src', 'data', 'github.json');

/** 仅允许 https + 精确 host 白名单（天然拒绝 localhost/内网/保留地址） */
const ALLOWED_HOSTS = new Set(['api.github.com', 'github-contributions-api.jogruber.de']);

/** 校验 URL：仅 http/https 协议且 host 在白名单内 */
function assertSafeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`非法 URL：${raw}`);
  }
  if (url.protocol !== 'https:') throw new Error(`仅允许 https：${raw}`);
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`host 不在白名单：${url.hostname}`);
  }
  return url;
}

/** 安全 fetch：校验 + 超时 + 非 2xx 抛错 */
async function safeFetch(url, options = {}, timeoutMs = 15000) {
  assertSafeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/** 从 src/config/site.ts 读 githubUser（脚本不直接 import TS，用正则取值保持单一数据源） */
function readGithubUser() {
  const src = readFileSync(join(root, 'src', 'config', 'site.ts'), 'utf8');
  const m = src.match(/githubUser:\s*"([^"]+)"/);
  return m ? m[1] : '';
}

/** GraphQL：近一年 contributionCalendar → 53×7 等级矩阵 */
async function fetchByGraphql(user, token) {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount contributionLevel}}}}}}`;
  const res = await safeFetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables: { login: user } }),
  });
  const json = await res.json();
  const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar?.weeks?.length) throw new Error('GraphQL 返回中没有日历数据');
  const weeks = calendar.weeks.map((w) =>
    w.contributionDays.map((d) => Math.min(4, Number(d.contributionLevel) || 0)),
  );
  return { weeks, total: calendar.totalContributions ?? null, source: 'graphql' };
}

/** 公共 contributions API：按 ISO 日期返回 count/level，再拼装成 53×7（周日开头） */
async function fetchByPublicApi(user) {
  const res = await safeFetch(
    `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}`,
  );
  const json = await res.json();
  const days = json?.contributions;
  if (!Array.isArray(days) || days.length === 0) throw new Error('公共 API 返回中没有贡献数据');

  // GitHub 日历从周日开始；先在开头补齐第一周的空位
  const firstDate = new Date(`${days[0].date}T00:00:00Z`);
  const lead = firstDate.getUTCDay(); // 0=周日
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(0);
  for (const d of days) cells.push(Math.max(0, Math.min(4, Number(d.level) || 0)));

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  // 最多保留 53 周（去掉不完整的尾周）
  while (weeks.length > 53) weeks.pop();
  // total 兜底：jogruber v4 的 total 是按年份键（如 { "2025": 123 }），
  // 读 lastYear 永远取不到（日志一直显示「共 ? 次」）——改为按天累加，口径最稳
  const total =
    typeof json.total?.lastYear === 'number'
      ? json.total.lastYear
      : days.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  return { weeks, total, source: 'jogruber' };
}

const user = readGithubUser();
let result = {
  user,
  fetchedAt: new Date().toISOString(),
  source: 'empty',
  total: null,
  weeks: null,
};

try {
  if (!user || user === 'yourname') {
    throw new Error('site.ts 的 githubUser 还是占位值，填入真实用户名后重新构建');
  }
  const token = process.env.GITHUB_TOKEN;
  try {
    if (token) {
      const r = await fetchByGraphql(user, token);
      result = { user, fetchedAt: new Date().toISOString(), ...r };
    } else {
      throw new Error('未设置 GITHUB_TOKEN，走公共 API');
    }
  } catch {
    const r = await fetchByPublicApi(user);
    result = { user, fetchedAt: new Date().toISOString(), ...r };
  }
  console.log(`[fetch-github] 已抓取 ${user} 的贡献数据（${result.source}，共 ${result.total ?? '?'} 次）`);
} catch (err) {
  result = {
    user,
    fetchedAt: new Date().toISOString(),
    source: 'empty',
    total: null,
    weeks: null,
    error: err instanceof Error ? err.message : String(err),
  };
  console.warn(`[fetch-github] 抓取失败（不影响构建）：${result.error}`);
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
