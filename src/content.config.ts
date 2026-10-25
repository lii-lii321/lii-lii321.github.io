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
    /** 题图：站内绝对路径（如 /projects/math-tutor-rag/notebook.webp）；
     *  width/height 为真实像素，渲染时定比例防跳动；缺省文章无题图 */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    coverWidth: z.number().optional(),
    coverHeight: z.number().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
