'use client';

import { useMemo, useState } from 'react';

function unitConvert(value: number, from: string, to: string) {
  const length: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
  const mass: Record<string, number> = { g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237 };
  const temperature = (n: number, unit: string) => unit === 'c' ? n : unit === 'f' ? (n - 32) * 5 / 9 : n - 273.15;
  const fromTemp = (n: number, unit: string) => unit === 'c' ? n : unit === 'f' ? n * 9 / 5 + 32 : n + 273.15;
  if (['c','f','k'].includes(from) && ['c','f','k'].includes(to)) return fromTemp(temperature(value, from), to);
  const factors = { ...length, ...mass };
  return value * factors[from] / factors[to];
}

export function ToolWorkspace({ slug }: { slug: string }) {
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');
  const [a, setA] = useState('100');
  const [b, setB] = useState('10');

  const result = useMemo(() => {
    if (slug === 'unit-conversion') {
      const n = Number(value);
      if (!Number.isFinite(n)) return '—';
      try { return unitConvert(n, from, to).toLocaleString(undefined, { maximumFractionDigits: 8 }); } catch { return 'Choose compatible units'; }
    }
    if (slug === 'percentage-calculator') {
      const x = Number(a), y = Number(b);
      if (![x,y].every(Number.isFinite)) return '—';
      return `${((x * y) / 100).toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
    }
    if (slug === 'lease-escalation-calculator') {
      const base = Number(a), rate = Number(b);
      if (![base,rate].every(Number.isFinite)) return '—';
      return `${(base * (1 + rate / 100)).toLocaleString(undefined, { maximumFractionDigits: 2 })} / period`;
    }
    return 'Select a supported tool.';
  }, [slug, value, from, to, a, b]);

  if (slug === 'unit-conversion') return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Value<input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" /></label><label className="text-sm font-medium">From<select value={from} onChange={(e) => setFrom(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option>mm</option><option>cm</option><option>m</option><option>km</option><option>in</option><option>ft</option><option>yd</option><option>mi</option><option>g</option><option>kg</option><option>oz</option><option>lb</option><option>c</option><option>f</option><option>k</option></select></label><label className="text-sm font-medium">To<select value={to} onChange={(e) => setTo(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"><option>mm</option><option>cm</option><option>m</option><option>km</option><option>in</option><option>ft</option><option>yd</option><option>mi</option><option>g</option><option>kg</option><option>oz</option><option>lb</option><option>c</option><option>f</option><option>k</option></select></label></div><Result value={`${result} ${to}`} /></div>;

  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">{slug === 'percentage-calculator' ? 'Number' : 'Starting amount'}<input value={a} onChange={(e) => setA(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" /></label><label className="text-sm font-medium">{slug === 'percentage-calculator' ? 'Percent' : 'Escalation %'}<input value={b} onChange={(e) => setB(e.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none" /></label></div><Result value={slug === 'percentage-calculator' ? `${result}` : `$${result}`} /><p className="text-xs text-slate-500">This is a calculation aid, not professional or legal advice.</p></div>;
}

function Result({ value }: { value: string }) { return <div className="rounded-2xl bg-slate-950 p-6 text-white"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Result</div><div className="mt-2 break-words text-3xl font-semibold tracking-tight">{value}</div></div>; }
