import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let _app = null;
let _auth = null;

function getFirebaseApp() {
  if (!firebaseConfig.apiKey) return null;
  if (!_app) {
    // Reutiliza app existente (evita erro em hot reload)
    const existing = getApps();
    _app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
    _auth = getAuth(_app);
  }
  return _app;
}

export function getFirebaseAuth() {
  getFirebaseApp();
  return _auth;
}

export function isFirebaseConfigured() {
  return !!firebaseConfig.apiKey;
}

/**
 * Verifica se há um resultado pendente de redirect do Google.
 * Retorna { idToken, user } se houver, ou null caso contrário.
 * Erros de storage/cookie (iOS Safari, incógnito) são tratados
 * silenciosamente e retornam null.
 */
export async function getGoogleRedirectResult() {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) return null;

    const idToken = await result.user.getIdToken();
    return {
      idToken,
      user: {
        email: result.user.email,
        name: result.user.displayName,
        photoUrl: result.user.photoURL,
      },
    };
  } catch (err) {
    // Erros não-críticos: sem resultado de redirect, storage bloqueado
    // (comum no iOS Safari com cookies de terceiros bloqueados),
    // ou popup/redirect cancelado pelo usuário
    const silentCodes = [
      'auth/null-user',
      'auth/web-storage-unsupported',
      'auth/internal-error',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
    ];
    if (silentCodes.includes(err.code)) return null;

    // Erros reais de autenticação (domínio não autorizado, etc.) são propagados
    throw err;
  }
}

/**
 * Inicia o login com Google.
 *
 * Usa signInWithPopup em TODAS as plataformas (desktop, Android Chrome,
 * iOS Safari) — funciona quando chamado diretamente de um gesto do usuário.
 * Se o browser bloquear o popup, faz fallback para signInWithRedirect.
 *
 * Retorna { idToken, user } em caso de sucesso.
 * Retorna null se o usuário fechou o popup ou se o redirect foi iniciado.
 */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase não configurado. Login com Google indisponível.');
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return {
      idToken,
      user: {
        email: result.user.email,
        name: result.user.displayName,
        photoUrl: result.user.photoURL,
      },
    };
  } catch (err) {
    // Usuário fechou o popup — não é erro
    if (
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }

    // Browser bloqueou o popup (raro) — fallback para redirect
    if (err.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null; // Página vai recarregar após o redirect do Google
    }

    throw err;
  }
}
