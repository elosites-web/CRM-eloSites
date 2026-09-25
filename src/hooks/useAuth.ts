import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

function translateAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-disabled':
      return 'Este usuário foi desativado.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente novamente.';
    default:
      return 'Não foi possível entrar. Verifique seus dados e tente novamente.';
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true as const };
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      return { ok: false as const, error: translateAuthError(code) };
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true as const };
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      // Don't reveal whether the address is actually registered — treat
      // "not found" the same as success so login emails can't be enumerated.
      if (code === 'auth/user-not-found') return { ok: true as const };
      if (code === 'auth/invalid-email') {
        return { ok: false as const, error: 'E-mail inválido.' };
      }
      if (code === 'auth/network-request-failed') {
        return {
          ok: false as const,
          error: 'Sem conexão. Verifique sua internet e tente novamente.',
        };
      }
      if (code === 'auth/too-many-requests') {
        return {
          ok: false as const,
          error: 'Muitas tentativas. Tente novamente em alguns minutos.',
        };
      }
      return {
        ok: false as const,
        error: 'Não foi possível enviar o e-mail agora. Tente novamente.',
      };
    }
  }, []);

  return { user, loading, login, logout, resetPassword };
}
