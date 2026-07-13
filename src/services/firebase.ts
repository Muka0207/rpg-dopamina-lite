import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCFOXfa9LrryOwJz2GJGQW0BfZMO-KSDBs",
  authDomain: "rpg-dopamina-lite.firebaseapp.com",
  projectId: "rpg-dopamina-lite",
  storageBucket: "rpg-dopamina-lite.firebasestorage.app",
  messagingSenderId: "113218473798",
  appId: "1:113218473798:web:e1431e77984a19515fdf47",
  measurementId: "G-VSF9LGGXEX",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);