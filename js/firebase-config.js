// ============================================
//  Firebase Configuration & Initialization
//  زُبَد — منصة اللفظي
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// إعدادات Firebase (آمنة للنشر في الـ frontend)
const firebaseConfig = {
  apiKey: "AIzaSyAL7nrsx0_V5xEO97nPr4H6H2TK9nsSzss",
  authDomain: "zobad-58ed1.firebaseapp.com",
  projectId: "zobad-58ed1",
  storageBucket: "zobad-58ed1.firebasestorage.app",
  messagingSenderId: "612064826076",
  appId: "1:612064826076:web:8d0286d52eb710d2fada19"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تصدير الخدمات المستخدمة
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// إعدادات Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
