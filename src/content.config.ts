import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 博客文章集合（规格 §10.3）。
 * readingTime 在渲染时由 entry.body 现算（见 components/blog/utils.ts），
 * 不放在 frontmatter schema 里手填。
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['工程', '架构', '随笔', '开源']),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
