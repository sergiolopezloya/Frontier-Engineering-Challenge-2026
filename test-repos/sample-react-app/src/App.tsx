import React, { useState, useEffect } from 'react';
import axios from 'axios';
import _ from 'lodash';

// Technical debt: Hardcoded API endpoints & secrets, memory leak in setInterval, no error boundaries
export function App() {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const BACKEND_URL = "http://localhost:5000/api/v1/users";
  const HARDCODED_API_KEY = "sk_live_983472398472938472398"; // Security issue

  useEffect(() => {
    // Memory leak: setInterval without clearInterval in cleanup
    setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    // Unsafe unhandled promise
    axios.get(BACKEND_URL, {
      headers: { 'Authorization': `Bearer ${HARDCODED_API_KEY}` }
    }).then((res: any) => {
      setData(_.uniqBy(res.data, 'id'));
    });
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard React Legacy</h1>
      <p>Counter: {count}</p>
      <ul>
        {data.map((item: any) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
