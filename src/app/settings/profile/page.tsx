import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function updateProfile(formData: FormData) {
  'use server';
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/auth/sign-in');
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;
  if (!userId) redirect('/auth/sign-in?next=/settings/profile');

  const username = String(formData.get('username') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();

  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) redirect('/settings/profile?error=Username must be 3–24 characters using lowercase letters, numbers, or underscores.');
  if (displayName.length > 60) redirect('/settings/profile?error=Display name must be 60 characters or fewer.');
  if (bio.length > 280) redirect('/settings/profile?error=Bio must be 280 characters or fewer.');

  const { error } = await supabase.from('profiles').upsert({ id: userId, username: username || null, display_name: displayName || null, bio: bio || null }, { onConflict: 'id' });
  if (error) redirect(`/settings/profile?error=${encodeURIComponent(error.code === '23505' ? 'That username is already taken.' : 'We could not save your profile.')}`);
  redirect('/settings/profile?saved=1');
}

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/auth/sign-in');
  const { data: claims } = await supabase.auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;
  if (!userId) redirect('/auth/sign-in?next=/settings/profile');
  await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  const { data: profile } = await supabase.from('profiles').select('username,display_name,bio').eq('id', userId).maybeSingle();

  return <main className="container py-12"><div className="mx-auto max-w-2xl"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile</h1><p className="mt-2 text-slate-600">Choose the public identity shown beside your questions, answers, and comments.</p>{error&&<div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</div>}{saved&&<div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700" role="status">Profile saved.</div>}<form action={updateProfile} className="card mt-8 space-y-6 p-6"><div><label htmlFor="username" className="text-sm font-medium">Username</label><input id="username" name="username" defaultValue={profile?.username ?? ''} placeholder="your_name" maxLength={24} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"/><p className="mt-1 text-xs text-slate-500">3–24 lowercase letters, numbers, or underscores.</p></div><div><label htmlFor="displayName" className="text-sm font-medium">Display name</label><input id="displayName" name="displayName" defaultValue={profile?.display_name ?? ''} maxLength={60} placeholder="How people should see you" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"/></div><div><label htmlFor="bio" className="text-sm font-medium">Bio</label><textarea id="bio" name="bio" defaultValue={profile?.bio ?? ''} maxLength={280} rows={4} placeholder="A little context about what you know or build." className="mt-2 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-slate-500"/></div><div className="flex items-center justify-end"><button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Save profile</button></div></form></div></main>;
}
