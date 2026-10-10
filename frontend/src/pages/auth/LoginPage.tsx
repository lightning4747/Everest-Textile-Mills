import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { ShieldCheck, LogIn, AlertCircle, KeyRound, User } from 'lucide-react';

const DEMO_ACCOUNTS: { role: UserRole; name: string; email: string; desc: string }[] = [
  { role: 'admin', name: 'Admin User', email: 'admin@everest.local', desc: 'Full System & Config Control' },
  { role: 'manager', name: 'Plant Manager', email: 'manager@everest.local', desc: 'Financials, Costs & Scheduling' },
  { role: 'operator', name: 'Floor Operator', email: 'operator@everest.local', desc: 'Machines & Yarn Receipts' },
  { role: 'qc_inspector', name: 'QC Specialist', email: 'qc@everest.local', desc: 'Inspection Queue & Decisions' },
  { role: 'viewer', name: 'Guest Viewer', email: 'viewer@everest.local', desc: 'Read-only Dashboards' },
  { role: 'client', name: 'Acme Corp', email: 'client@acme.com', desc: 'Client Portal Access' },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@everest.local');
  const [password, setPassword] = useState('changeme123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('changeme123');
  };

  return (
    <div className="h-screen w-full flex bg-[#0a0e14] overflow-hidden">
      {/* 1. Left side: clean inset framed image */}
      <div className="hidden lg:flex lg:w-1/2 h-full p-3 bg-[#0a0e14]">
        <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
          <img
            src="/assets/image.png"
            alt="Everest Textile Mills"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 2. Right side: Neat minimal background with centered login form card */}
      <div className="relative w-full lg:w-1/2 h-full flex flex-col justify-between items-center px-4 py-6 sm:px-8 overflow-y-auto bg-slate-50 text-slate-900">
        
        {/* Top spacer */}
        <div className="w-full h-2" />

        {/* 3. Form card */}
        <div className="w-full max-w-[420px] p-6 sm:p-7 bg-white border border-slate-200 shadow-xl rounded-[24px] space-y-4 my-auto">
          {/* Above form: logo, short heading ("Welcome back"), subtext */}
          <div className="text-center pb-1">
            <img
              src="/assets/logo.png"
              alt="Everest Textile Mills"
              className="h-10 w-auto mx-auto mb-2 object-contain"
            />
            <h2 className="text-xl font-display font-bold text-[var(--cyprus)] leading-tight">Welcome back</h2>
            <p className="text-xs text-[var(--text-soft)] mt-1">Sign in to Everest Mills Terminal</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="section-title block mb-1 text-xs font-semibold text-[var(--text)]">Email Address</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-field pl-9.5 text-xs font-mono w-full h-10 rounded-lg"
                  placeholder="name@everest.local"
                />
              </div>
            </div>

            <div>
              <label className="section-title block mb-1 text-xs font-semibold text-[var(--text)]">Password</label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="input-field pl-9.5 text-xs font-mono w-full h-10 rounded-lg"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center h-10.5 text-xs font-semibold rounded-lg shadow-md transition-all active:scale-[0.99] mt-1"
            >
              <LogIn size={15} />
              {loading ? 'Authenticating...' : 'Sign In to Mill Terminal'}
            </button>
          </form>

          <div className="pt-3 border-t border-[var(--border)]">
            <p className="text-[10.5px] font-semibold text-[var(--text-soft)] uppercase tracking-wider mb-2">
              One-Click Demo Profiles (password: changeme123)
            </p>
            <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-0.5 custom-scrollbar">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    email === acc.email
                      ? 'border-[var(--cyprus)] bg-[var(--surface-2)] text-[var(--text)]'
                      : 'border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)]'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--text)] leading-tight">
                      {acc.name} <span className="font-mono text-[9px] text-[var(--text-soft)]">({acc.role})</span>
                    </p>
                    <p className="text-[9.5px] text-[var(--text-soft)] leading-tight">{acc.email} · {acc.desc}</p>
                  </div>
                  {email === acc.email && <ShieldCheck size={14} className="text-[var(--ok)] flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Small footer at bottom of right side */}
        <footer className="pt-3 pb-1 text-center text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} Everest Textile Mills. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
