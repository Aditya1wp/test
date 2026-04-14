import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDY3fOjn2twa1oYVG8yicf8dTb7IySkTj4",
  authDomain: "mock-engine-d3c15.firebaseapp.com",
  projectId: "mock-engine-d3c15",
  storageBucket: "mock-engine-d3c15.firebasestorage.app",
  messagingSenderId: "37782531470",
  appId: "1:37782531470:web:c15e72ce3902ef994648df"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
