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
    <div className="h-screen w-full flex bg-[#f8f9fb] overflow-hidden">
      {/* 1. Left side: clean inset framed image with lower padding */}
      <div className="hidden lg:flex lg:w-1/2 h-full p-2 lg:p-3 bg-[#f8f9fb]">
        <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-black/5 shadow-xl">
          <img
            src="/assets/image.png"
            alt="Everest Textile Mills"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 2. Right side: tinted background with subtle shapes, grid, centered form card, and footer */}
      <div className="relative w-full lg:w-1/2 h-full flex flex-col justify-between items-center px-4 py-3 sm:px-8 sm:py-4 bg-[#f8f9fb] overflow-hidden">
        {/* Decorative background shapes (pointer-events-none, non-competing) */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#004643] opacity-[0.12] blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#1C7C54] opacity-[0.10] blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.25]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #53706D 1px, transparent 0)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, black 20%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 50% 50%, black 20%, transparent 85%)',
          }}
        />

        {/* Top spacer */}
        <div className="w-full h-0 sm:h-1" />

        {/* 3. Form card */}
        <div className="relative z-10 w-full max-w-[390px] p-5 sm:p-6 bg-white border border-[var(--border)] shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[18px] space-y-3.5 my-auto">
          {/* Above form: logo, short heading ("Welcome back"), subtext */}
          <div className="text-center pb-1">
            <img
              src="/assets/logo.png"
              alt="Everest Textile Mills"
              className="h-8 w-auto mx-auto mb-2 object-contain"
            />
            <h2 className="text-lg font-display font-semibold text-[var(--text)] leading-tight">Welcome back</h2>
            <p className="text-[11px] text-[var(--text-soft)] mt-0.5">Sign in to Everest Mills</p>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="section-title block mb-1 text-[11px]">Email Address</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-field pl-8 text-xs font-mono w-full h-9"
                  placeholder="name@everest.local"
                />
              </div>
            </div>

            <div>
              <label className="section-title block mb-1 text-[11px]">Password</label>
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="input-field pl-8 text-xs font-mono w-full h-9"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center h-9 text-xs font-semibold"
            >
              <LogIn size={13} />
              {loading ? 'Authenticating...' : 'Sign In to Mill Terminal'}
            </button>
          </form>

          <div className="pt-2 border-t border-[var(--border)]">
            <p className="text-[10px] font-semibold text-[var(--text-soft)] uppercase tracking-wider mb-1.5">
              One-Click Demo Profiles (password: changeme123)
            </p>
            <div className="grid grid-cols-1 gap-1">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
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
                  {email === acc.email && <ShieldCheck size={13} className="text-[var(--ok)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Small footer at bottom of right side */}
        <footer className="relative z-10 pt-2 pb-1 text-center text-[10.5px] text-[var(--text-soft)]">
          © {new Date().getFullYear()} Everest Textile Mills. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
