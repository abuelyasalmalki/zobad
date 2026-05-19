// ============================================
//  Authentication Functions
//  زُبَد — التسجيل، الدخول، الخروج
// ============================================

import { auth, db, googleProvider } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ============================================
//  1. التسجيل بالإيميل وكلمة المرور
// ============================================
export async function signUpWithEmail(email, password, fullName) {
  try {
    // إنشاء الحساب في Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // تحديث الاسم في profile
    await updateProfile(user, { displayName: fullName });

    // إنشاء document للمستخدم في Firestore
    await createUserDocument(user, { name: fullName });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: getArabicError(error.code) };
  }
}

// ============================================
//  2. الدخول بالإيميل وكلمة المرور
// ============================================
export async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // تحديث lastLogin
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      lastLogin: serverTimestamp()
    });

    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getArabicError(error.code) };
  }
}

// ============================================
//  3. التسجيل/الدخول عبر Google
// ============================================
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // التحقق إذا كان المستخدم موجود مسبقاً في Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      // مستخدم جديد → نُنشئ له document
      await createUserDocument(user, { name: user.displayName });
    } else {
      // مستخدم موجود → نحدّث lastLogin
      await updateDoc(doc(db, "users", user.uid), {
        lastLogin: serverTimestamp()
      });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: getArabicError(error.code) };
  }
}

// ============================================
//  4. تسجيل الخروج
// ============================================
export async function logOut() {
  try {
    // 🧹 نظافة شاملة: مسح كل الـ state على client-side قبل signOut
    if (typeof window !== 'undefined') {
      // مسح window vars
      delete window._zubadCurrentUser;
      delete window._zubadDerivedCurrent;

      // مسح localStorage (التقدّم اللحظي للدروس)
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith('zubad_lesson_')) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn('[auth] localStorage cleanup failed:', e);
      }
    }

    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: getArabicError(error.code) };
  }
}

// ============================================
//  5. إعادة تعيين كلمة المرور
// ============================================
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: getArabicError(error.code) };
  }
}

// ============================================
//  6. مراقبة حالة المستخدم
// ============================================
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// ============================================
//  7. الحصول على بيانات المستخدم من Firestore
// ============================================
export async function getUserData(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: "البيانات غير موجودة" };
    }
  } catch (error) {
    return { success: false, error: getArabicError(error.code) };
  }
}

// ============================================
//  دالة داخلية — إنشاء document للمستخدم
// ============================================
async function createUserDocument(user, additionalData = {}) {
  const userRef = doc(db, "users", user.uid);

  const userData = {
    uid: user.uid,
    name: additionalData.name || user.displayName || "طالب",
    email: user.email,
    photoURL: user.photoURL || null,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),

    // حالة الاشتراك (افتراضياً: مجاني)
    subscription: {
      status: "free",      // "free" | "paid" | "expired"
      paidAt: null,
      expiresAt: null,
      amount: 0
    },

    // تقدّم الطالب — هيكل كامل ومتسق مع firestore.js
    progress: {
      currentLesson: "lesson-01",        // ✅ string بدل رقم
      completedLessons: [],
      totalQuestionsSolved: 0,
      totalCorrectAnswers: 0,             // ✅ مضاف
      totalMistakes: 0,                    // ✅ مضاف
      lastStudyDate: null
    },

    // نقاط الضعف (تشخيص ذكي)
    weaknesses: {}                        // ✅ مضاف
  };

  await setDoc(userRef, userData);
  return userData;
}

// ============================================
//  دالة داخلية — ترجمة أخطاء Firebase للعربية
// ============================================
function getArabicError(errorCode) {
  const errors = {
    'auth/email-already-in-use': 'هذا البريد مسجّل مسبقاً. سجّل دخول بدلاً من ذلك.',
    'auth/invalid-email': 'البريد الإلكتروني غير صالح.',
    'auth/weak-password': 'كلمة المرور ضعيفة. استخدم ٨ أحرف على الأقل.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقاً.',
    'auth/network-request-failed': 'تحقّق من اتصالك بالإنترنت.',
    'auth/popup-closed-by-user': 'تم إغلاق نافذة Google قبل الاكتمال.',
    'auth/cancelled-popup-request': 'تم إلغاء طلب التسجيل.',
    'auth/popup-blocked': 'المتصفح يمنع النوافذ المنبثقة. فعّلها وحاول مرة ثانية.',
    'auth/operation-not-allowed': 'طريقة الدخول معطّلة. تواصل مع الدعم.',
    'auth/account-exists-with-different-credential': 'هذا البريد مسجّل بطريقة مختلفة.',
  };

  return errors[errorCode] || 'حدث خطأ، حاول مرة ثانية.';
}
