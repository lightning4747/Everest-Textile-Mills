import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';
import { ShieldCheck, LogIn, AlertCircle, KeyRound, User } from 'lucide-react';
import FloatingAnimation from '../../components/ui/FloatingAnimation';

const DEMO_ACCOUNTS: { role: UserRole; name: string; email: string; desc: string }[] = [
  { role: 'admin', name: 'Admin User', email: 'admin@everest.local', desc: 'Full System & Config Control' },
  { role: 'manager', name: 'Plant Manager', email: 'manager@everest.local', desc: 'Financials, Costs & Scheduling' },
  { role: 'client', name: 'Acme Corp (Customer)', email: 'client@acme.com', desc: 'Customer Portal & Order Placement' },
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
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 py-6 sm:px-8 bg-white text-slate-900 overflow-x-hidden overflow-y-auto">
      {/* Floating Animation WebGL component with white background and Cyprus-Emerald aurora wave */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <FloatingAnimation
          backgroundColor="#ffffff"
          colorStops={['#004643', '#1C7C54', '#48A9A6']}
          amplitude={1.15}
          blend={0.5}
          speed={0.85}
          className="w-full h-full"
        />
      </div>

      {/* Top Header / Branding */}


      {/* Centered Login Card directly over the flowing aurora wave */}
      <main className="relative z-10 w-full max-w-[430px] my-auto py-4">
        <div className="p-7 sm:p-8 bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,70,67,0.12)] rounded-[28px] space-y-4">
          {/* Logo, heading and subtext */}
          <div className="text-center pb-1">
            <img
              src="/assets/logo.png"
              alt="Everest Textile Mills"
              className="h-10 w-auto mx-auto mb-2.5 object-contain"
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
                  className="input-field !pl-10 text-xs font-mono w-full h-10 rounded-lg bg-white/80 border-slate-200 focus:bg-white transition-colors"
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
                  className="input-field !pl-10 text-xs font-mono w-full h-10 rounded-lg bg-white/80 border-slate-200 focus:bg-white transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center h-10.5 text-xs font-semibold rounded-lg shadow-md transition-all active:scale-[0.99] mt-1 bg-[var(--cyprus)] hover:bg-[var(--cyprus-dark)]"
            >
              <LogIn size={15} />
              {loading ? 'Authenticating...' : 'Sign In to Mill Terminal'}
            </button>
          </form>

          <div className="pt-3 border-t border-[var(--border)]">
            <p className="text-[10.5px] font-semibold text-[var(--text-soft)] uppercase tracking-wider mb-2">
              One-Click Demo Profiles (password: changeme123)
            </p>
            <div className="grid grid-cols-1 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5 custom-scrollbar">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-left transition-colors ${
                    email === acc.email
                      ? 'border-[var(--cyprus)] bg-[var(--cyprus)]/5 text-[var(--text)] font-semibold shadow-sm'
                      : 'border-slate-200/80 bg-white/70 hover:bg-white text-[var(--text-soft)]'
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
      </main>

      {/* Footer */}
      <footer className="relative z-10 pt-3 pb-1 text-center text-xs font-medium text-slate-500">
        © {new Date().getFullYear()} Everest Textile Mills. All rights reserved.
      </footer>
    </div>
  );
}
