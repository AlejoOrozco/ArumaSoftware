// Import the functions you need from the SDKs you need
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkN16qX0oVzxTjIbRnLXs_-JmyYMpgwik",
  authDomain: "arumacafe-9dfed.firebaseapp.com",
  projectId: "arumacafe-9dfed",
  storageBucket: "arumacafe-9dfed.firebasestorage.app",
  messagingSenderId: "1036496817851",
  appId: "1:1036496817851:web:7f2a10687c04b2d5dda39e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);