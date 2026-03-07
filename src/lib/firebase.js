import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let auth = null;

export function getFirebaseApp() {
  if (!firebaseConfig.apiKey) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  }
  return app;
}

export function getFirebaseAuth() {
  getFirebaseApp();
  return auth;
}

export async function signInWithGoogle() {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase não configurado. Login com Google indisponível.');
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  if (isMobile()) {
    // On mobile, redirect is more reliable than popup
    await signInWithRedirect(firebaseAuth, provider);
    return null; // page will reload after redirect
  }

  const result = await signInWithPopup(firebaseAuth, provider);
  const idToken = await result.user.getIdToken();

  return {
    idToken,
    user: {
      email: result.user.email,
      name: result.user.displayName,
      photoUrl: result.user.photoURL,
    },
  };
}

export async function getGoogleRedirectResult() {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) return null;

  const result = await getRedirectResult(firebaseAuth);
  if (!result) return null;

  const idToken = await result.user.getIdToken();
  return {
    idToken,
    user: {
      email: result.user.email,
      name: result.user.displayName,
      photoUrl: result.user.photoURL,
    },
  };
}

export function isFirebaseConfigured() {
  return !!firebaseConfig.apiKey;
}
