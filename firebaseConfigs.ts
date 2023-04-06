// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_apiKey as string,
  authDomain: process.env.NEXT_PUBLIC_authDomain as string,
  databaseURL: process.env.NEXT_PUBLIC_databaseURL as string,
  projectId: process.env.NEXT_PUBLIC_projectId as string,
  storageBucket: process.env.NEXT_PUBLIC_storageBucket as string,
  messagingSenderId: process.env.NEXT_PUBLIC_messagingSenderId as string,
  appId: process.env.NEXT_PUBLIC_appId as string,
  measurementId: process.env.NEXT_PUBLIC_measurementId as string
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);