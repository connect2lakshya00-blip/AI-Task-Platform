import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OPERATIONS = ['uppercase', 'lowercase', 'reverse', 'wordcount'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: '', inputText: '', operation: 'uppercase' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks');
      setTasks(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/tasks', form);
      setForm({ title: '', inputText: '', operation: 'uppercase' });
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async (id) => {
    try {
      await api.post(`/tasks/${id}/run`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue task');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 22 }}>AI Task Platform</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{user?.email}</span>
          <button className="btn-danger btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Create Task */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 16 }}>New Task</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            placeholder="Task title" required
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            placeholder="Input text" required rows={3}
            value={form.inputText} onChange={e => setForm({ ...form, inputText: e.target.value })}
            style={{ resize: 'vertical' }}
          />
          <select value={form.operation} onChange={e => setForm({ ...form, operation: e.target.value })}>
            {OPERATIONS.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={creating} style={{ alignSelf: 'flex-start' }}>
            {creating ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>

      {/* Task List */}
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Tasks ({tasks.length})</h2>
      {tasks.length === 0 && (
        <p style={{ color: '#64748b', fontSize: 14 }}>No tasks yet. Create one above.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map(task => (
          <div key={task._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{task.title}</span>
                <span className={`badge badge-${task.status}`}>{task.status}</span>
                <span style={{ fontSize: 12, color: '#64748b', background: '#0f172a', padding: '2px 6px', borderRadius: 4 }}>
                  {task.operation}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#64748b' }}>
                {new Date(task.createdAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary btn-sm"
                onClick={() => handleRun(task._id)}
                disabled={task.status === 'running'}
              >
                {task.status === 'running' ? 'Running...' : 'Run'}
              </button>
              <Link to={`/tasks/${task._id}`}>
                <button className="btn-sm" style={{ background: '#334155', color: '#e2e8f0' }}>View</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
