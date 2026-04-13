import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBJqPkWUje-396EBfZ3CjNeGSwIh25vFNA",
  authDomain: "mocktest-e666b.firebaseapp.com",
  projectId: "mocktest-e666b",
  storageBucket: "mocktest-e666b.firebasestorage.app",
  messagingSenderId: "1031041404718",
  appId: "1:1031041404718:web:44c5d82eb838c62073b4bf"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
