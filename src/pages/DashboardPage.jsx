import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, Database, KeyRound, User, CheckCircle, ExternalLink } from 'lucide-react';

export const DashboardPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <header className="dashboard-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img
            src="/textlogo-dark.svg"
            alt="NewsCuddle"
            className="dashboard-nav-logo"
            onError={(e) => {
              e.target.src = '/logo.svg';
            }}
          />
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, letterSpacing: '0.05em' }}>
            ● INSTITUTIONAL CONSOLE
          </span>
        </div>

        <div className="dashboard-nav-actions">
          <div className="user-profile-badge">
            <div className="avatar-circle">
              {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
            </div>
            <span>{user?.name || user?.email}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              (@{user?.username || 'member'})
            </span>
          </div>

          <button
            type="button"
            className="btn-signout"
            onClick={handleLogout}
            id="btn-dashboard-logout"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
            Welcome back, {user?.firstName || user?.name || 'Member'} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            You are authenticated and viewing the protected portal. When you are logged out, visitors to any route or the root site are automatically routed to the Login page.
          </p>
        </div>

        <div className="dashboard-grid">
          {/* Main Card */}
          <div className="dashboard-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldCheck size={20} color="#008751" />
              <h2 className="dashboard-card-title" style={{ margin: 0 }}>
                Active Authenticated Session
              </h2>
            </div>
            <p className="dashboard-card-desc">
              Your login state is currently stored in persistent session memory. Refreshing this page or reopening the browser will maintain your logged-in state.
            </p>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}>Full Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user?.name || `${user?.firstName} ${user?.lastName}`}</span>

                <span style={{ fontWeight: 600, color: '#64748b' }}>Username:</span>
                <span style={{ color: '#008751', fontWeight: 600 }}>@{user?.username}</span>

                <span style={{ fontWeight: 600, color: '#64748b' }}>Email:</span>
                <span>{user?.email}</span>

                <span style={{ fontWeight: 600, color: '#64748b' }}>Auth Token:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b', wordBreak: 'break-all' }}>
                  {token || 'jwt_active_session'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto' }}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Test Sign Out (Redirects to /login)</span>
              </button>
            </div>
          </div>

          {/* Side Card: Backend & Database Ready */}
          <div className="dashboard-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Database size={20} color="#008751" />
              <h2 className="dashboard-card-title" style={{ margin: 0 }}>
                Go &amp; MongoDB Architecture
              </h2>
            </div>
            <p className="dashboard-card-desc">
              Scaffolded Go backend server with MongoDB schema models and JWT authentication routes.
            </p>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={15} color="#10b981" />
                <span><code>/api/v1/auth/login</code> (Go + Mongo)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={15} color="#10b981" />
                <span><code>/api/v1/auth/register</code> (Bcrypt + Validation)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={15} color="#10b981" />
                <span><code>/api/v1/auth/me</code> (Protected JWT Route)</span>
              </li>
            </ul>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Start Go backend command:
              </p>
              <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.75rem', marginTop: '0.4rem', overflowX: 'auto' }}>
go run ./backend/cmd/server
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
