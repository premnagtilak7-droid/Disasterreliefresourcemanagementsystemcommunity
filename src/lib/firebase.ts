import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Hardcoded Firebase Config for hackathon
const firebaseConfig = {
  apiKey: "AIzaSyDavULjoQSsrKM4ox77tTki3VAwFQLPRY",
  authDomain: "relief-map-c4c06.firebaseapp.com",
  projectId: "relief-map-c4c06",
  storageBucket: "relief-map-c4c06.firebasestorage.app",
  messagingSenderId: "981339164232",
  appId: "1:981339164232:web:c42fb9812c38a81ca1927d",
};

// Initialize Firebase (prevent re-initialization)
let app;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
  window.alert("FIREBASE CONNECTED");
}

// Initialize Firestore Database
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

console.log("Firebase Initialized");

export default app;
