import React, { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'https://bulkmail-backend-eum4.onrender.com').replace(/\/$/, '');
const AUTH_SESSION_KEY = 'bulkmail-authenticated';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin123';

async function readApiResponse(response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return { rawBody };
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem(AUTH_SESSION_KEY) === 'true'
  );
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginUsername === VALID_USERNAME && loginPassword === VALID_PASSWORD) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      setIsAuthenticated(true);
      setLoginError('');
      setLoginPassword('');
      return;
    }

    setLoginError('Invalid username or password');
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    setSubject('');
    setBody('');
    setRecipients('');
    setHistory([]);
    setMessage(null);
    setLoginUsername('');
    setLoginPassword('');
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/emails`);
      const data = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(data?.error || data?.rawBody || `Request failed with status ${res.status}`);
      }

      setHistory(data);
    } catch (err) {
      setMessage({ type: 'error', text: `History load failed: ${err.message}` });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="App auth-shell">
        <div className="auth-card">
          <div className="auth-badge">Bulk Mail Admin</div>
          <h1>Login</h1>
          <p className="auth-subtitle">Use your admin credentials to access the bulk mail dashboard.</p>
          <form onSubmit={handleLogin} className="auth-form">
            <div style={{ marginBottom: 14 }}>
              <label>Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            {loginError && <div className="message error">{loginError}</div>}
            <button type="submit">Sign In</button>
          </form>
          <div className="auth-hint">
            Demo login: <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!subject || !body || !recipients) {
      setMessage({ type: 'error', text: 'Please fill all fields' });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, recipients })
      });
      const data = await readApiResponse(res);

      if (res.ok) {
        setMessage({ type: 'success', text: 'Emails queued/sent successfully', data });
        setSubject(''); setBody(''); setRecipients('');
        fetchHistory();
      } else {
        setMessage({ type: 'error', text: data?.error || data?.rawBody || 'Send failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Send failed: ${err.message}` });
    } finally { setSending(false); }
  };

  return (
    <div className="App" style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div className="topbar">
        <div>
          <div className="topbar-title">Admin Dashboard</div>
          <div className="topbar-subtitle">Have a nice workday!</div>
        </div>
        <button type="button" className="ghost-button" onClick={handleLogout}>Logout</button>
      </div>
      <form onSubmit={handleSend} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8 }}>
          <label>Subject</label><br />
          <input value={subject} onChange={e=>setSubject(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Body (HTML allowed)</label><br />
          <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Recipients (comma separated)</label><br />
          <textarea value={recipients} onChange={e=>setRecipients(e.target.value)} rows={3} style={{ width: '100%' }} />
        </div>
        <button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send'}</button>
      </form>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text} {message.data && message.data.previewUrl && (
            <span>- Preview: <a href={message.data.previewUrl} target="_blank" rel="noreferrer">open</a></span>
          )}
        </div>
      )}

      <h2>Recent Sends</h2>
      <div>
        {history.length === 0 && <div>No history yet.</div>}
        {history.map(item => (
          <div key={item._id} className="history-card">
            <div><strong>{item.subject}</strong> — <small>{new Date(item.createdAt).toLocaleString()}</small></div>
            <div>Status: {item.status}</div>
            <div>Recipients: {item.recipients && item.recipients.join(', ')}</div>
            {item.info && item.info.messageId && <div>MessageId: {item.info.messageId}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
