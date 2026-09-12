const FIREBASE_SDK_VERSION = '10.14.1';

let firebaseAuthClientPromise = null;

export function getFirebaseAuthErrorCode(error) {
  return String(error?.code || error?.message || 'firebase_auth_unavailable');
}

export async function getFirebaseBrowserAuthClient({ fetchImpl = globalThis.fetch } = {}) {
  if (firebaseAuthClientPromise) return firebaseAuthClientPromise;
  if (typeof fetchImpl !== 'function') throw new TypeError('firebase_fetch_required');

  firebaseAuthClientPromise = (async () => {
    const response = await fetchImpl('/__/firebase/init.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('firebase_init_unavailable');

    const config = await response.json();
    const [appMod, authMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`)
    ]);

    const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(config);
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserSessionPersistence);
    try { await authMod.getRedirectResult(auth); } catch (_) {}

    return { app, auth, authMod };
  })().catch((error) => {
    firebaseAuthClientPromise = null;
    throw error;
  });

  return firebaseAuthClientPromise;
}

export async function signInWithGoogle(client) {
  if (!client?.auth || !client?.authMod) throw new TypeError('firebase_auth_client_required');
  const { auth, authMod } = client;
  const provider = new authMod.GoogleAuthProvider();

  try {
    return await authMod.signInWithPopup(auth, provider);
  } catch (error) {
    const redirectCodes = new Set([
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/operation-not-supported-in-this-environment'
    ]);
    if (redirectCodes.has(String(error?.code || ''))) {
      return authMod.signInWithRedirect(auth, provider);
    }
    throw error;
  }
}
