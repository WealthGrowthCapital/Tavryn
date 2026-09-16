'use client';

import { useState } from 'react';

export function ReportForm({ targetType, targetId, slug }: { targetType: 'question' | 'answer'; targetId: string; slug: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="text-sm text-slate-400 hover:text-slate-700">Report</button>;
  }

  return (
    <form action="/api/report" method="post" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="slug" value={slug} />
      <select name="reason" required defaultValue="" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
        <option value="" disabled>Reason</option>
        <option value="spam">Spam</option>
        <option value="abuse">Abuse</option>
        <option value="misleading">Misleading</option>
        <option value="other">Other</option>
      </select>
      <button type="submit" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Submit</button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 hover:text-slate-900">Cancel</button>
    </form>
  );
}
