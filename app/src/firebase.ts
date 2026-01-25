// Firebase Configuration
// 既存のFirebaseプロジェクトを使用

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCQk8FAwozz34jdqoW6wxFqeneaOtA_AP4",
    authDomain: "word-wolf-1432f.firebaseapp.com",
    databaseURL: "https://word-wolf-1432f-default-rtdb.firebaseio.com",
    projectId: "word-wolf-1432f",
    storageBucket: "word-wolf-1432f.firebasestorage.app",
    messagingSenderId: "777084245986",
    appId: "1:777084245986:web:a6976ec8ee22a110dbcbbb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
