import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Hardcoded Firebase Config for hackathon
const firebaseConfig = {
  apiKey: "AIzaSyDuCy0w7IrNmU5jd1wagE_kmaJS6hrBD-c",
  authDomain: "relief-map-ee6cf.firebaseapp.com",
  projectId: "relief-map-ee6cf",
  storageBucket: "relief-map-ee6cf.firebasestorage.app",
  messagingSenderId: "691243225791",
  appId: "1:691243225791:web:b5acb73820d1e08f4b6c0a",
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

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
