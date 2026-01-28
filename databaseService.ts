
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Firestore,
  enableIndexedDbPersistence,
  initializeFirestore
} from 'firebase/firestore';
import { UserProfile, ShopProfile, ProductRequest, Offer, Order, DailyUpdate } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyDiEH7WGW6plRI0oAzPQkPMQpTSHfpaXMQ",
  authDomain: "locallink-town.firebaseapp.com",
  projectId: "locallink-town",
  storageBucket: "locallink-town.firebasestorage.app",
  messagingSenderId: "213164605800",
  appId: "1:213164605800:web:f3c7761b11df9eafe596dd",
  measurementId: "G-C3LCEMNQP5"
};

let dbInstance: Firestore | null = null;

const getDb = (): Firestore => {
  if (dbInstance) return dbInstance;
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
  if (typeof window !== 'undefined') enableIndexedDbPersistence(dbInstance).catch(() => {});
  return dbInstance;
};

const stripUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) cleaned[key] = stripUndefined(value);
  });
  return cleaned;
};

export const dbService = {
  isCloudActive: () => { try { return !!getDb(); } catch (e) { return false; } },
  
  loadUsers: async (): Promise<(UserProfile | ShopProfile)[]> => {
    try {
      const firestore = getDb();
      const querySnapshot = await getDocs(collection(firestore, "users"));
      return querySnapshot.docs.map(doc => doc.data() as UserProfile | ShopProfile);
    } catch (e) { return []; }
  },

  loadMarketData: async () => {
    try {
      const fs = getDb();
      const [reqs, offs, ords] = await Promise.all([
        getDocs(collection(fs, "requests")),
        getDocs(collection(fs, "offers")),
        getDocs(collection(fs, "orders"))
      ]);
      return {
        requests: reqs.docs.map(d => d.data() as ProductRequest),
        offers: offs.docs.map(d => d.data() as Offer),
        orders: ords.docs.map(d => d.data() as Order)
      };
    } catch (e) { return { requests: [], offers: [], orders: [] }; }
  },

  listenToUserProfile: (userId: string, callback: (user: UserProfile | ShopProfile | null) => void) => {
    try {
      const firestore = getDb();
      return onSnapshot(doc(firestore, "users", userId), (snap) => {
        if (snap.exists()) callback(snap.data() as UserProfile | ShopProfile);
        else callback(null);
      });
    } catch (e) { return () => {}; }
  },

  listenToMarketData: (callback: (data: any) => void) => {
    let firestore: Firestore;
    try { firestore = getDb(); } catch (e) { return () => {}; }
    const currentData = { requests: [] as ProductRequest[], offers: [] as Offer[], orders: [] as Order[], updates: [] as DailyUpdate[] };
    const emit = () => callback({ ...currentData });
    const unsubscribers = [
      onSnapshot(collection(firestore, "requests"), (snap) => { currentData.requests = snap.docs.map(d => d.data() as ProductRequest); emit(); }),
      onSnapshot(collection(firestore, "offers"), (snap) => { currentData.offers = snap.docs.map(d => d.data() as Offer); emit(); }),
      onSnapshot(collection(firestore, "orders"), (snap) => { currentData.orders = snap.docs.map(d => d.data() as Order); emit(); }),
      onSnapshot(query(collection(firestore, "updates"), orderBy("createdAt", "desc"), limit(20)), (snap) => { currentData.updates = snap.docs.map(d => d.data() as DailyUpdate).filter(u => u.expiresAt > Date.now()); emit(); })
    ];
    return () => unsubscribers.forEach(unsub => unsub());
  },

  saveUsers: async (users: (UserProfile | ShopProfile)[]) => {
    try {
      const firestore = getDb();
      for (const user of users) {
        const cleaned = stripUndefined(user);
        await setDoc(doc(firestore, "users", cleaned.id), cleaned, { merge: true });
      }
    } catch (e) {}
  },

  updateUserProfile: async (id: string, data: Partial<UserProfile | ShopProfile>) => {
    try {
      const firestore = getDb();
      const cleaned = stripUndefined(data);
      await setDoc(doc(firestore, "users", id), cleaned, { merge: true });
    } catch (e) {}
  },

  saveItem: async (id: string, type: 'request' | 'offer' | 'order' | 'update', data: any) => {
    try {
      const firestore = getDb();
      const colMap: Record<string, string> = { 'request': 'requests', 'offer': 'offers', 'order': 'orders', 'update': 'updates' };
      const colName = colMap[type] || type;
      const cleanedData = stripUndefined(data);
      return setDoc(doc(firestore, colName, id), cleanedData, { merge: true });
    } catch (e) { throw e; }
  }
};
