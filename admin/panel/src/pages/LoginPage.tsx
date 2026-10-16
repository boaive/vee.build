import { Loader2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useMe, useSignIn } from '@/api/hooks';
import { Brand } from '@/components/Brand';
import { Turnstile, type TurnstileHandle } from '@/components/Turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/layouts/ThemeToggle';

export default function LoginPage() {
  const me = useMe();
  const signIn = useSignIn();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const turnstile = useRef<TurnstileHandle>(null);
  const [token, setToken] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const tokenRef = useRef('');
  tokenRef.current = token;

  if (me.data) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!email || !password) {
      setProblem('Enter your email and your password.');
      return;
    }
    setProblem(null);
    // Turnstile usually answers in a moment, without asking anything. Wait for it briefly.
    let t = token;
    if (!t) {
      setWaiting(true);
      for (let i = 0; i < 40 && !t; i++) {
        await new Promise((r) => setTimeout(r, 250));
        t = tokenRef.current;
      }
      setWaiting(false);
      if (!t) {
        setProblem('The check that you are a person has not finished. If a box has appeared, tick it, then sign in again.');
        return;
      }
    }
    signIn.mutate(
      { email, password, turnstileToken: t },
      {
        onSuccess: () => void navigate(from, { replace: true }),
        onError: (err) => {
          setProblem(err.message);
          turnstile.current?.reset();
        },
      },
    );
  };

  const busy = waiting || signIn.isPending;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0a0b0d] p-10 text-[#f2f0eb] lg:flex" aria-hidden>
        <Brand className="[&_span:last-child]:text-[#c8f031]" />
        <ModuleDrawing />
        <p className="data max-w-sm text-xs leading-relaxed text-[#8d9095]">
          Module A 6 × 3 × 3 m · Module B 3 × 3 × 3 m
          <br />
          Enquiries, quotes and prices for the website.
        </p>
      </aside>

      <main className="relative flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="absolute right-3 top-3">
          <ThemeToggle />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <p className="eyebrow mb-2">Sign in</p>
          <h1 className="text-3xl font-bold" style={{ fontStretch: '108%' }}>
            Admin panel
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">For the owner of VEE.BUILD.</p>

          <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" autoFocus required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Turnstile ref={turnstile} action="login" onToken={setToken} onError={setProblem} />
            {problem && (
              <p role="alert" className="text-sm text-danger">
                {problem}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Sign in
            </Button>
            <p className="text-xs text-muted-foreground">Forgotten the password? It can be set again from the command line only (admin/README.md). There is no reset by email.</p>
          </form>
        </div>
      </main>
    </div>
  );
}

/** The two standard modules in elevation, with their dimension lines: the real sizes from the brief. */
function ModuleDrawing() {
  const stroke = '#f2f0eb';
  const dim = '#c8f031';
  return (
    <svg viewBox="0 0 520 260" className="w-full max-w-lg" role="img" aria-label="Drawing of Module A, 6 by 3 metres, and Module B, 3 by 3 metres">
      <g fill="none" strokeWidth="1.25">
        <rect x="20" y="60" width="300" height="150" stroke={stroke} />
        <rect x="320" y="60" width="150" height="150" stroke={stroke} />
        <path d="M20 60 L320 210 M320 60 L20 210" stroke={stroke} strokeOpacity="0.18" />
        <path d="M320 60 L470 210 M470 60 L320 210" stroke={stroke} strokeOpacity="0.18" />
        <path d="M20 226 H320 M20 220 V232 M320 220 V232" stroke={dim} />
        <path d="M320 226 H470 M470 220 V232" stroke={dim} />
        <path d="M494 60 V210 M488 60 H500 M488 210 H500" stroke={dim} />
      </g>
      <g fill={dim} fontFamily="DM Mono, monospace" fontSize="11" textAnchor="middle">
        <text x="170" y="246">6000</text>
        <text x="395" y="246">3000</text>
        <text x="0" y="0" transform="translate(512 140) rotate(-90)">3000</text>
        <text x="170" y="50" fill={stroke} fillOpacity="0.6">MODULE A</text>
        <text x="395" y="50" fill={stroke} fillOpacity="0.6">MODULE B</text>
      </g>
    </svg>
  );
}
