import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';

/** RSS 订阅（规格 §7 / §13.4）：Astro 内置 @astrojs/rss，构建时生成 /rss.xml */
export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
  return rss({
    title: `${siteConfig.name} · ${siteConfig.tagline}`,
    description: siteConfig.title,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: [post.data.category, ...post.data.tags],
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
