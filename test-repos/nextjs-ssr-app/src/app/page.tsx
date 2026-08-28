import React from 'react';

export default async function DashboardPage() {
  // Simulating Server-Side Rendering Data Fetch
  const res = await fetch('https://api.example.com/data', { cache: 'no-store' });
  const data = await res.json().catch(() => ({ status: 'ok', items: [] }));

  return (
    <main style={{ padding: '2rem' }}>
      <h1>SSR Next.js 14 Dashboard</h1>
      <p>Server-side rendered dynamic page.</p>
      <ul>
        {data.items?.map((item: { id: string; name: string }) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </main>
  );
}
