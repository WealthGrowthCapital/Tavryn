import Link from 'next/link';
import { SignInForm } from '@/components/sign-in-form';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith('/') ? params.next : '/questions/ask';

  return (
    <main className="container py-16">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-950">← Back to Tavryn</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-slate-600">Use your email to receive a secure one-click sign-in link.</p>
        <SignInForm next={next} />
      </div>
    </main>
  );
}
