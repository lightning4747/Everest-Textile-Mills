import { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';
import { ShieldCheck, LogIn, AlertCircle, KeyRound, User } from 'lucide-react';

const DEMO_ACCOUNTS: { role: UserRole; name: string; email: string; desc: string }[] = [
  { role: 'admin', name: 'Admin User', email: 'admin@everest.local', desc: 'Full System & Config Control' },
  { role: 'manager', name: 'Plant Manager', email: 'manager@everest.local', desc: 'Financials, Costs & Scheduling' },
  { role: 'operator', name: 'Floor Operator', email: 'operator@everest.local', desc: 'Machines & Yarn Receipts' },
  { role: 'qc_inspector', name: 'QC Specialist', email: 'qc@everest.local', desc: 'Inspection Queue & Decisions' },
  { role: 'viewer', name: 'Guest Viewer', email: 'viewer@everest.local', desc: 'Read-only Dashboards' },
];

export default function LoginModal() {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('admin@everest.local');
  const [password, setPassword] = useState('changeme123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('changeme123');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 bg-[var(--surface)] border border-[var(--border)] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#004643] text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">
            E
          </div>
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text)]">Everest Textile Mills ERP</h2>
            <p className="text-xs text-[var(--text-soft)]">Authenticate to access live mill operations</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="section-title block mb-1">Email Address</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input-field pl-9 text-xs font-mono w-full"
                placeholder="name@everest.local"
              />
            </div>
          </div>

          <div>
            <label className="section-title block mb-1">Password</label>
            <div className="relative">
              <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--olive-grey)]" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="input-field pl-9 text-xs font-mono w-full"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center h-10 text-xs font-semibold"
          >
            <LogIn size={14} />
            {loading ? 'Authenticating...' : 'Sign In to Mill Terminal'}
          </button>
        </form>

        <div className="pt-2 border-t border-[var(--border)]">
          <p className="text-[11px] font-semibold text-[var(--text-soft)] uppercase tracking-wider mb-2">
            One-Click Demo Profiles (password: changeme123)
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => selectDemoAccount(acc.email)}
                className={`flex items-center justify-between p-2 rounded-lg border text-left transition-colors ${
                  email === acc.email
                    ? 'border-[var(--cyprus)] bg-[var(--surface-2)] text-[var(--text)]'
                    : 'border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text-soft)]'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-[var(--text)]">{acc.name} <span className="font-mono text-[10px] text-[var(--text-soft)]">({acc.role})</span></p>
                  <p className="text-[10px] text-[var(--text-soft)]">{acc.email} · {acc.desc}</p>
                </div>
                {email === acc.email && <ShieldCheck size={14} className="text-[var(--ok)]" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
