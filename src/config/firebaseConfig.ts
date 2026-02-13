import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBkN16qX0oVzxTjIbRnLXs_-JmyYMpgwik",
  authDomain: "arumacafe-9dfed.firebaseapp.com",
  projectId: "arumacafe-9dfed",
  storageBucket: "arumacafe-9dfed.firebasestorage.app",
  messagingSenderId: "1036496817851",
  appId: "1:1036496817851:web:7f2a10687c04b2d5dda39e",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

