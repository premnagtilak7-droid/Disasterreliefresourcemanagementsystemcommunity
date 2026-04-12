import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase Config using VITE_ environment variables
// Falls back to hardcoded values for development/hackathon
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDuCy0w7IrNmU5jd1wagE_kmaJS6hrBD-c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "relief-map-ee6cf.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "relief-map-ee6cf",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "relief-map-ee6cf.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "691243225791",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:691243225791:web:b5acb73820d1e08f4b6c0a",
};

// Initialize Firebase (prevent re-initialization)
let app;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized");
}

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Firebase Auth with local persistence
export const auth = getAuth(app);

// Set persistence to LOCAL to persist across browser restarts
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase Auth persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Failed to set auth persistence:", error);
  });

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
