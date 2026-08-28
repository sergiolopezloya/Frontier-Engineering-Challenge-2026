import React, { useEffect, useState } from 'react';

export interface WidgetProps {
  tenantId?: string;
}

export function AnalyticsWidget({ tenantId = 'default' }: WidgetProps) {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    // Security flaw: Accepting cross-origin postMessages from ANY origin without origin validation
    const handleMessage = (event: MessageEvent) => {
      // Missing: if (event.origin !== 'https://trusted-host.com') return;
      if (event.data?.type === 'ANALYTICS_EVENT') {
        setEvents((prev) => [...prev, String(event.data.payload)]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 8 }}>
      <h3>Analytics Microfrontend Widget ({tenantId})</h3>
      <p>Listening for cross-frame messages.</p>
      <ul>
        {events.map((ev, i) => (
          <li key={i}>{ev}</li>
        ))}
      </ul>
    </div>
  );
}

export default AnalyticsWidget;
