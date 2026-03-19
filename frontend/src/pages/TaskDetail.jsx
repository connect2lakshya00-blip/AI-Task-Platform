import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/tasks/${id}`);
        setTask(data);
      } catch {
        setError('Task not found');
      }
    };
    fetch();
    const interval = setInterval(fetch, 2000);
    return () => clearInterval(interval);
  }, [id]);

  if (error) return <div style={{ padding: 24 }}><p className="error-msg">{error}</p><Link to="/">← Back</Link></div>;
  if (!task) return <div style={{ padding: 24, color: '#64748b' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Link to="/" style={{ fontSize: 13, color: '#94a3b8' }}>← Back to Dashboard</Link>

      <div style={{ marginTop: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ fontSize: 20 }}>{task.title}</h1>
        <span className={`badge badge-${task.status}`}>{task.status}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>OPERATION</h3>
          <p style={{ fontFamily: 'monospace' }}>{task.operation}</p>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>CREATED</h3>
          <p style={{ fontSize: 13 }}>{new Date(task.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>INPUT</h3>
        <pre style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {task.inputText}
        </pre>
      </div>

      {task.result && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#166534' }}>
          <h3 style={{ fontSize: 13, color: '#86efac', marginBottom: 8 }}>RESULT</h3>
          <pre style={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#86efac' }}>
            {task.result}
          </pre>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>LOGS</h3>
        {task.logs.length === 0 && <p style={{ fontSize: 13, color: '#64748b' }}>No logs yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {task.logs.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
