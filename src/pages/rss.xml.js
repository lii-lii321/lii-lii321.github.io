import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { siteConfig } from '../config/site';

/** RSS 订阅（规格 §7 / §13.4）：全文输出（content:encoded）+ media:content 封面。
 *  正文用 AstroContainer 把每篇 Markdown 渲染成 HTML（容器 API 是官方推荐的
 *  全文 RSS 做法）；容器里没有页面 base，站内相对链接需要换成绝对地址，
 *  RSS 阅读器不解析相对 URL。 */
export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const container = await AstroContainer.create();
  const origin = context.site ?? new URL('https://lii-lii321.github.io');

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);
      // 站内相对地址绝对化（img src / a href / srcset），阅读器才能加载图片与跳转
      const absolute = html
        .replace(/(src|href)="\/(?!\/)/g, `$1="${origin.origin}/`)
        .replace(/(srcset)="([^"]*)"/g, (_, attr, value) => {
          const resolved = value
            .split(',')
            .map((part) => {
              const url = part.trim().split(/\s+/)[0];
              return url.startsWith('/') ? part.trim().replace(url, `${origin.origin}${url}`) : part.trim();
            })
            .join(', ');
          return `${attr}="${resolved}"`;
        });
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        categories: [post.data.category, ...post.data.tags],
        link: `/blog/${post.id}/`,
        content: absolute,
        // 题图优先（各文章 frontmatter cover），无题图回退全站默认分享图
        customData: `<media:content url="${new URL(post.data.cover ?? '/og-default.png', origin)}" medium="image" />`,
      };
    }),
  );

  return rss({
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.title,
    site: context.site,
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
      media: 'http://search.yahoo.com/mrss/',
    },
    items,
    customData: '<language>zh-cn</language>',
  });
}
