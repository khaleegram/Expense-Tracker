// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDcgWkzjEcOGBXszj04dXqVmabuQuhqU_k",
  authDomain: "expense-a787a.firebaseapp.com",
  projectId: "expense-a787a",
  storageBucket: "expense-a787a.firebasestorage.app",
  messagingSenderId: "1088585223070",
  appId: "1:1088585223070:web:242206029911bd0a1b648f",
  measurementId: "G-7RSWBK0DPX"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
