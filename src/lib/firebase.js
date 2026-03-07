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

// Android Chrome: popup abre nova aba e não retorna → usa redirect
// iOS Safari: redirect quebra por restrição de cookies → usa popup
// Desktop: popup
function useRedirect() {
  return /Android/i.test(navigator.userAgent);
}

function buildProvider() {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

// Retorna { idToken, user } ou null (popup fechado / redirect iniciado)
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase não configurado. Login com Google indisponível.');

  const provider = buildProvider();

  if (useRedirect()) {
    await signInWithRedirect(auth, provider);
    return null; // página recarrega após autenticação
  }

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
    if (
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (err.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

// Verifica resultado pendente de redirect (Android Chrome)
// Retorna { idToken, user } ou null
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
  } catch {
    // Sem resultado de redirect ou storage bloqueado (iOS incógnito, etc.)
    return null;
  }
}
