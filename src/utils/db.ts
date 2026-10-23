// Native IndexedDB persistence layer for FAAB GAR
const DB_NAME = 'FAAB_GAR_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

export interface UserProfile {
  nomPrenoms: string;
  email: string;
  contact: string;
  institution: string;
  fonction: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  nomPrenoms: '',
  email: '',
  contact: '',
  institution: '',
  fonction: '',
};

export interface AppPersistedState {
  portfolios?: any[];
  activeProjectId?: string | null;
  language?: 'fr' | 'en';
  currency?: 'FCFA' | 'EUR' | 'USD';
  theme?: 'light' | 'dark';
  lastFileName?: string;
  userProfile?: UserProfile;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToIndexedDB(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Fallback to localStorage for serializable values
    try {
      if (key !== 'fileHandle') {
        localStorage.setItem(`faab_gar_${key}`, JSON.stringify(value));
      }
    } catch {}
  }
}

export async function loadFromIndexedDB<T = any>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    const result = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (result !== undefined) return result;
  } catch {}

  try {
    const fallback = localStorage.getItem(`faab_gar_${key}`);
    if (fallback) return JSON.parse(fallback) as T;
  } catch {}
  return undefined;
}

export async function hydrateFullState(): Promise<AppPersistedState> {
  const [portfolios, activeProjectId, language, currency, theme, lastFileName, userProfile] =
    await Promise.all([
      loadFromIndexedDB<any[]>('portfolios'),
      loadFromIndexedDB<string | null>('activeProjectId'),
      loadFromIndexedDB<'fr' | 'en'>('language'),
      loadFromIndexedDB<'FCFA' | 'EUR' | 'USD'>('currency'),
      loadFromIndexedDB<'light' | 'dark'>('theme'),
      loadFromIndexedDB<string>('lastFileName'),
      loadFromIndexedDB<UserProfile>('userProfile'),
    ]);

  let resolvedPortfolios = portfolios;
  if (!resolvedPortfolios || !Array.isArray(resolvedPortfolios) || resolvedPortfolios.length === 0) {
    try {
      const legacy = localStorage.getItem('faab_gar_portfolios');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          resolvedPortfolios = parsed;
        }
      }
    } catch {}
  }

  return {
    portfolios: resolvedPortfolios,
    activeProjectId,
    language,
    currency,
    theme,
    lastFileName,
    userProfile,
  };
}
