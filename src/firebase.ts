import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, query, where, limit, QueryConstraint } from 'firebase/firestore';

// Define the expected config structure
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

// Lazy initialization of Firebase
let app;
let auth;
let db;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const authInstance = getAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance.currentUser?.uid,
      email: authInstance.currentUser?.email,
      emailVerified: authInstance.currentUser?.emailVerified,
      isAnonymous: authInstance.currentUser?.isAnonymous,
      tenantId: authInstance.currentUser?.tenantId,
      providerInfo: authInstance.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function getFirebaseConfig(): Promise<FirebaseConfig | null> {
  try {
    // In this environment, we expect firebase-applet-config.json to be present
    // if set_up_firebase was successful.
    const response = await fetch('/firebase-applet-config.json');
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
}

export async function initFirebase() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const config = await getFirebaseConfig();
    if (!config) {
      console.warn('Firebase configuration not found. Please ensure set_up_firebase was successful.');
      return null;
    }
    app = initializeApp(config);
  }
  
  auth = getAuth(app);
  
  // Use the specific database ID if provided in the config
  const config = await getFirebaseConfig();
  db = getFirestore(app, config?.firestoreDatabaseId || '(default)');
  
  return { app, auth, db };
}

export const googleProvider = new GoogleAuthProvider();

export { auth, db };
