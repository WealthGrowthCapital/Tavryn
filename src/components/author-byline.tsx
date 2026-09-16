import Link from 'next/link';

type AuthorProfile = { id: string; username: string | null; display_name: string | null };

export function AuthorByline({ author }: { author?: AuthorProfile | null }) {
  const label = author?.display_name || (author?.username ? `@${author.username}` : 'Member');
  return author?.username ? <Link href={`/u/${author.username}`} className="font-medium text-slate-700 hover:text-slate-950">{label}</Link> : <span className="font-medium text-slate-700">{label}</span>;
}
