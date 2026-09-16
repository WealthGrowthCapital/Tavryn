const tools: Record<string, { name: string; description: string }> = {
  'random-team-generator': {
    name: 'Random Team Generator',
    description: 'Create balanced random teams with simple constraints.',
  },
  'lease-escalation-calculator': {
    name: 'Lease Escalation Calculator',
    description: 'Calculate scheduled rent increases across a lease term.',
  },
  'unit-conversion': {
    name: 'Unit Conversion',
    description: 'Fast everyday and professional unit conversions.',
  },
};

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = tools[slug];

  if (!tool) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-semibold">Tool not found</h1>
        <p className="mt-3 text-slate-600">That utility does not exist yet.</p>
      </main>
    );
  }

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Free tool</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{tool.name}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{tool.description}</p>
        <div className="card mt-8 p-8">
          <p className="text-sm text-slate-500">Interactive utility placeholder. The first production vertical will replace this with the verified calculation or workflow.</p>
        </div>
      </div>
    </main>
  );
}
