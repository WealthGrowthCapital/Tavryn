import Link from 'next/link';

export function ToolCard({ title, description, category, slug }: { title: string; description: string; category: string; slug: string }) {
  return (
    <Link href={`/tools/${slug}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-blue-600">{category}</div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 text-sm font-medium text-slate-900">Open tool →</div>
    </Link>
  );
}
