// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.apiKey as string,
  authDomain: process.env.authDomain as string,
  databaseURL: process.env.databaseURL as string,
  projectId: process.env.projectId as string,
  storageBucket: process.env.storageBucket as string,
  messagingSenderId: process.env.messagingSenderId as string,
  appId: process.env.appId as string,
  measurementId: process.env.measurementId as string
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export function getImage(path: string) {
  return getDownloadURL(ref(storage, path))
}