import type { MetadataRoute } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tavryn.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServerClient();
  const staticRoutes = ['', '/search', '/questions', '/categories', '/tools'].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.7,
  }));

  if (!supabase) return staticRoutes;

  const [{ data: questions }, { data: categories }, { data: tools }] = await Promise.all([
    supabase.from('questions').select('slug,updated_at').in('status', ['open', 'closed']).order('updated_at', { ascending: false }),
    supabase.from('categories').select('slug').eq('is_public', true).eq('is_indexable', true),
    supabase.from('tools').select('slug,updated_at').eq('is_published', true),
  ]);

  return [
    ...staticRoutes,
    ...(questions ?? []).map((question) => ({ url: `${siteUrl}/questions/${question.slug}`, lastModified: question.updated_at, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...(categories ?? []).map((category) => ({ url: `${siteUrl}/categories/${category.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...(tools ?? []).map((tool) => ({ url: `${siteUrl}/tools/${tool.slug}`, lastModified: tool.updated_at, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
