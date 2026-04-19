import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDY3fOjn2twa1oYVG8yicf8dTb7IySkTj4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-engine-d3c15.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-engine-d3c15",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-engine-d3c15.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "37782531470",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:37782531470:web:c15e72ce3902ef994648df"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
