import { useState, type FormEvent } from 'react';
import { Button } from './ui';

function ForgotPasswordForm({
  onResetPassword,
  onBack,
}: {
  onResetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await onResetPassword(email);
    setBusy(false);
    if (result.ok) setSent(true);
    else setError(result.error ?? 'Não foi possível enviar o e-mail agora.');
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-edge bg-bg2 p-5">
        <h2 className="mb-3 text-base font-bold">Verifique seu e-mail</h2>
        <p className="text-[13px] text-muted">
          Se <strong className="text-text">{email}</strong> estiver cadastrado, você vai
          receber um link para redefinir a senha em alguns minutos. Não esqueça de
          checar a caixa de spam.
        </p>
        <Button
          variant="ghost"
          className="mt-4 w-full justify-center"
          onClick={onBack}
        >
          Voltar para o login
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-edge bg-bg2 p-5"
    >
      <h2 className="mb-1 text-base font-bold">Recuperar senha</h2>
      <p className="mb-4 text-[12px] text-muted">
        Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
      </p>
      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-semibold text-muted">E-mail</label>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-edge bg-card px-2.5 py-2 text-[13px] text-text outline-none focus:border-brand"
        />
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      <Button type="submit" disabled={busy} className="w-full justify-center">
        {busy ? 'Enviando…' : 'Enviar link de recuperação'}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="mt-3 w-full text-center text-[11px] text-muted underline decoration-muted/40 underline-offset-2 hover:text-text"
      >
        Voltar para o login
      </button>
    </form>
  );
}

export function Login({
  onLogin,
  onResetPassword,
}: {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onResetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await onLogin(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? 'Não foi possível entrar.');
  }

  if (mode === 'forgot') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand to-brand-light" />
            <div>
              <h1 className="m-0 text-lg font-extrabold tracking-tight">ēloSites CRM</h1>
              <span className="text-xs text-muted">Acesso restrito</span>
            </div>
          </div>
          <ForgotPasswordForm
            onResetPassword={onResetPassword}
            onBack={() => setMode('login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand to-brand-light" />
          <div>
            <h1 className="m-0 text-lg font-extrabold tracking-tight">ēloSites CRM</h1>
            <span className="text-xs text-muted">Acesso restrito</span>
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-edge bg-bg2 p-5"
        >
          <h2 className="mb-4 text-base font-bold">Entrar</h2>
          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-muted">E-mail</label>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-edge bg-card px-2.5 py-2 text-[13px] text-text outline-none focus:border-brand"
            />
          </div>
          <div className="mb-2">
            <label className="mb-1 block text-[11px] font-semibold text-muted">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-edge bg-card px-2.5 py-2 text-[13px] text-text outline-none focus:border-brand"
            />
          </div>
          <div className="mb-4 text-right">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-[11px] text-muted underline decoration-muted/40 underline-offset-2 hover:text-text"
            >
              Esqueci minha senha
            </button>
          </div>
          {error && (
            <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full justify-center">
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted">
            Não há cadastro público. O acesso é criado no console do Firebase.
          </p>
        </form>
      </div>
    </div>
  );
}
