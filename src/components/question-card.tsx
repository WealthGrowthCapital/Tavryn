import Link from 'next/link';

export function QuestionCard({
  title,
  excerpt,
  category,
  answers,
  views,
}: {
  title: string;
  excerpt: string;
  category: string;
  answers: number;
  views: number;
}) {
  return (
    <Link href="#" className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{category}</span>
        <span>{answers} answers</span>
        <span>{views.toLocaleString()} views</span>
      </div>
      <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{excerpt}</p>
    </Link>
  );
}
