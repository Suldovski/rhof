import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_vtTquXKQBX1J7fzPUGTCuuJxriQyUfw",
  authDomain: "rhger-b7349.firebaseapp.com",
  projectId: "rhger-b7349",
  storageBucket: "rhger-b7349.firebasestorage.app",
  messagingSenderId: "532374444546",
  appId: "1:532374444546:web:007f09554624bd4a4b251b",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
