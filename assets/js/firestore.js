// ============================================
//  Firestore Functions — تقدّم الطالب ونقاط الضعف
//  زُبَد — منصة اللفظي
// ============================================

import { db, auth } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  increment,
  arrayUnion,
  deleteField
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// ============================================
//  ثوابت المنهج (للحسابات)
// ============================================

// 🛡️ حسابات الـ Admin (لها وصول كامل لكل الدروس بدون اشتراك)
// ⚠️ هذي الإيميلات تظهر في الكود — تأكد إن حساباتهم محمية بكلمة مرور قوية + Two-Factor Auth
const ADMIN_EMAILS = [
  'abuelyasalmalki@gmail.com',  // المطوّر — أبو الياس
  'molhaqat@gmail.com'           // الطالب المختبر
];

export const LESSONS_META = {
  'lesson-01': { id: 'lesson-01', num: 1, title: 'مدخل اللفظي', chapter: 1, isFree: true },
  'lesson-02': { id: 'lesson-02', num: 2, title: 'أنواع العلاقات', chapter: 1, isFree: true },
  'lesson-03': { id: 'lesson-03', num: 3, title: 'العلاقات النادرة', chapter: 2, isFree: false },
  'lesson-04': { id: 'lesson-04', num: 4, title: 'الفراغ الواحد', chapter: 3, isFree: false },
  'lesson-05': { id: 'lesson-05', num: 5, title: 'الفراغان', chapter: 3, isFree: false },
  'lesson-06': { id: 'lesson-06', num: 6, title: 'الفراغات الثلاثة', chapter: 3, isFree: false },
  'lesson-07': { id: 'lesson-07', num: 7, title: 'الخطأ السياقي', chapter: 4, isFree: false },
  'lesson-08': { id: 'lesson-08', num: 8, title: 'المفردة الشاذة', chapter: 4, isFree: false },
  'lesson-09': { id: 'lesson-09', num: 9, title: 'الاستيعاب — الأساسيات', chapter: 5, isFree: false },
  'lesson-10': { id: 'lesson-10', num: 10, title: 'المهارات المتقدّمة', chapter: 5, isFree: false },
  'lesson-11': { id: 'lesson-11', num: 11, title: 'التطبيق الشامل', chapter: 5, isFree: false },
  'lesson-12': { id: 'lesson-12', num: 12, title: 'دليل التكتيكات', chapter: 6, isFree: false },
  'lesson-13': { id: 'lesson-13', num: 13, title: 'المراجعة الشاملة', chapter: 6, isFree: false },
  'lesson-14': { id: 'lesson-14', num: 14, title: 'التمارين المكثفة', chapter: 6, isFree: false },
  'lesson-15': { id: 'lesson-15', num: 15, title: 'المحاكاة النهائية', chapter: 6, isFree: false }
};

export const TOTAL_LESSONS = 15;

// أنواع الأسئلة (لتشخيص نقاط الضعف)
export const QUESTION_TYPES = {
  analogy: 'التناظر اللفظي',
  completion: 'إكمال الجمل',
  contextError: 'الخطأ السياقي',
  odd: 'المفردة الشاذة',
  comprehension: 'استيعاب المقروء'
};

// ============================================
//  دوال Firestore — التقدّم
// ============================================

/**
 * حفظ نتيجة درس كاملة (كتابة واحدة)
 * @param {string} lessonId - مثلاً: "lesson-07"
 * @param {object} result - { score, total, correct, questions: [...] }
 */
export async function saveLessonResult(lessonId, result) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'لازم تسجّل دخول' };

  try {
    const lessonRef = doc(db, "users", user.uid, "lessonProgress", lessonId);
    const userRef = doc(db, "users", user.uid);

    // حساب الإحصائيات من النتيجة
    const correctCount = result.correct || 0;
    const totalQuestions = result.total || 0;
    const mistakesCount = totalQuestions - correctCount;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isCompleted = percentage >= 70; // يكتمل الدرس إذا حقّق 70%+

    // 1. حفظ تفاصيل الدرس
    await setDoc(lessonRef, {
      lessonId,
      completed: isCompleted,
      score: `${correctCount}/${totalQuestions}`,
      percentage,
      correctAnswers: correctCount,
      mistakes: mistakesCount,
      totalQuestions,
      questions: result.questions || [], // تفاصيل كل سؤال
      attempts: increment(1),
      completedAt: isCompleted ? serverTimestamp() : null,
      lastAttemptAt: serverTimestamp()
    }, { merge: true });

    // 2. تحديث الملخّص العام
    const updates = {
      'progress.totalQuestionsSolved': increment(totalQuestions),
      'progress.totalCorrectAnswers': increment(correctCount),
      'progress.totalMistakes': increment(mistakesCount),
      'progress.lastStudyDate': serverTimestamp()
    };

    // إذا اكتمل الدرس، أضفه للقائمة
    if (isCompleted) {
      updates['progress.completedLessons'] = arrayUnion(lessonId);
      // الدرس التالي يصير الحالي
      const nextLessonNum = LESSONS_META[lessonId].num + 1;
      if (nextLessonNum <= TOTAL_LESSONS) {
        const nextLessonId = `lesson-${String(nextLessonNum).padStart(2, '0')}`;
        updates['progress.currentLesson'] = nextLessonId;
      }
    }

    await updateDoc(userRef, updates);

    // 3. تحديث نقاط الضعف
    await updateWeaknesses(user.uid, result.questions || []);

    // 4. مسح localStorage للدرس (انتهى)
    clearLessonLocalProgress(lessonId);

    return {
      success: true,
      isCompleted,
      percentage,
      score: `${correctCount}/${totalQuestions}`
    };
  } catch (error) {
    console.error('[firestore] saveLessonResult error:', error);
    return { success: false, error: 'فشل حفظ النتيجة. حاول مرة ثانية.' };
  }
}

/**
 * تحديث نقاط الضعف بناءً على الأسئلة
 */
async function updateWeaknesses(userId, questions) {
  if (!questions || questions.length === 0) return;

  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const currentWeaknesses = (userDoc.data()?.weaknesses) || {};

    // عدّ الأسئلة حسب النوع
    const newCounts = {};
    questions.forEach(q => {
      const type = q.type || 'unknown';
      if (!newCounts[type]) {
        newCounts[type] = { total: 0, correct: 0 };
      }
      newCounts[type].total++;
      if (q.correct) newCounts[type].correct++;
    });

    // ضمّ النتائج الجديدة للقديمة
    const updatedWeaknesses = { ...currentWeaknesses };
    Object.keys(newCounts).forEach(type => {
      if (!updatedWeaknesses[type]) {
        updatedWeaknesses[type] = { total: 0, correct: 0, accuracy: 0 };
      }
      updatedWeaknesses[type].total += newCounts[type].total;
      updatedWeaknesses[type].correct += newCounts[type].correct;
      updatedWeaknesses[type].accuracy = Math.round(
        (updatedWeaknesses[type].correct / updatedWeaknesses[type].total) * 100
      );
    });

    await updateDoc(userRef, { weaknesses: updatedWeaknesses });
  } catch (error) {
    console.error('[firestore] updateWeaknesses error:', error);
  }
}

/**
 * تحديث الدرس الحالي فقط (بدون تسجيل إكمال)
 * يُستخدم لما الطالب يختار "كمّل للتالي" بعد فشل
 */
export async function updateCurrentLessonOnly(nextLessonId) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'لازم تسجّل دخول' };

  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      'progress.currentLesson': nextLessonId,
      'progress.lastStudyDate': serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('[firestore] updateCurrentLessonOnly error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * جلب التقدّم الكامل للطالب
 */
export async function getUserProgress() {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'لازم تسجّل دخول' };

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      console.warn('[firestore] user doc missing - this should not happen');
      return { success: false, error: 'البيانات غير موجودة' };
    }

    let data = userDoc.data();

    // 🔧 إصلاح ذاتي: لو في بيانات قديمة أو ناقصة، نصلحها
    let needsRepair = false;
    const repairs = {};

    // ١. تأكد إن progress موجود
    if (!data.progress) {
      data.progress = {};
      needsRepair = true;
    }

    // ٢. تأكد إن currentLesson string (مش رقم)
    if (typeof data.progress.currentLesson === 'number') {
      const num = data.progress.currentLesson;
      const fixedId = `lesson-${String(num).padStart(2, '0')}`;
      data.progress.currentLesson = fixedId;
      repairs['progress.currentLesson'] = fixedId;
      needsRepair = true;
      console.log('[firestore] fixed currentLesson (number → string):', fixedId);
    }

    // ٣. تأكد من وجود الحقول الأساسية
    const defaults = {
      'progress.currentLesson': 'lesson-01',
      'progress.completedLessons': [],
      'progress.totalQuestionsSolved': 0,
      'progress.totalCorrectAnswers': 0,
      'progress.totalMistakes': 0
    };

    for (const [path, defaultValue] of Object.entries(defaults)) {
      const keys = path.split('.');
      let val = data;
      for (const k of keys) val = val?.[k];
      if (val === undefined || val === null) {
        repairs[path] = defaultValue;
        needsRepair = true;
        // نحدّث في الـ data المحلية للقراءة الفورية
        if (keys.length === 2) {
          if (!data[keys[0]]) data[keys[0]] = {};
          data[keys[0]][keys[1]] = defaultValue;
        }
      }
    }

    // ٤. تأكد من weaknesses
    if (!data.weaknesses) {
      data.weaknesses = {};
      repairs['weaknesses'] = {};
      needsRepair = true;
    }

    // إصلاح Firestore في الخلفية (بدون انتظار)
    if (needsRepair) {
      console.log('[firestore] auto-repairing user doc:', repairs);
      updateDoc(doc(db, "users", user.uid), repairs).catch(err => {
        console.warn('[firestore] auto-repair failed:', err);
      });
    }

    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('[firestore] getUserProgress error:', error);
    return { success: false, error: 'فشل جلب البيانات.' };
  }
}

/**
 * جلب تفاصيل درس معيّن
 */
export async function getLessonProgress(lessonId) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'لازم تسجّل دخول' };

  try {
    const lessonDoc = await getDoc(
      doc(db, "users", user.uid, "lessonProgress", lessonId)
    );

    if (!lessonDoc.exists()) {
      return {
        success: true,
        data: {
          lessonId,
          completed: false,
          attempts: 0,
          percentage: 0
        }
      };
    }

    return { success: true, data: lessonDoc.data() };
  } catch (error) {
    return { success: false, error: 'فشل جلب الدرس.' };
  }
}

/**
 * جلب تقدّم كل الدروس مرة وحدة (٢ قراءة فقط)
 */
export async function getAllLessonsProgress() {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'لازم تسجّل دخول' };

  try {
    const progressSnapshot = await getDocs(
      collection(db, "users", user.uid, "lessonProgress")
    );

    const lessons = {};
    progressSnapshot.forEach(docSnap => {
      lessons[docSnap.id] = docSnap.data();
    });

    return { success: true, data: lessons };
  } catch (error) {
    return { success: false, error: 'فشل جلب الدروس.' };
  }
}

/**
 * التحقق من الاشتراك
 */
export async function checkSubscription() {
  const user = auth.currentUser;
  if (!user) return { isPaid: false, status: 'free' };

  // 🛡️ الـ Admins يُعتبرون مشتركين دائماً
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return { isPaid: true, status: 'admin', isAdmin: true };
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const subscription = userDoc.data()?.subscription;

    if (!subscription) return { isPaid: false, status: 'free' };

    if (subscription.status === 'paid' && subscription.expiresAt) {
      const expiresAt = subscription.expiresAt.toDate();
      const now = new Date();
      if (expiresAt > now) {
        return { isPaid: true, status: 'paid', expiresAt };
      } else {
        return { isPaid: false, status: 'expired', expiresAt };
      }
    }

    return { isPaid: false, status: subscription.status };
  } catch (error) {
    return { isPaid: false, status: 'free' };
  }
}

/**
 * التحقق من إمكانية الوصول للدرس
 */
export async function canAccessLesson(lessonId) {
  const lessonMeta = LESSONS_META[lessonId];
  if (!lessonMeta) return { canAccess: false, reason: 'الدرس غير موجود' };

  // 🛡️ الـ Admins يفتحون كل الدروس
  const user = auth.currentUser;
  if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.log('[admin] full access granted to:', user.email);
    return { canAccess: true, isAdmin: true };
  }

  // الدروس المجانية متاحة للجميع
  if (lessonMeta.isFree) return { canAccess: true };

  // الباقي يحتاج اشتراك
  const sub = await checkSubscription();
  if (sub.isPaid) return { canAccess: true };

  return {
    canAccess: false,
    reason: 'هذا الدرس يحتاج اشتراك',
    subscriptionStatus: sub.status
  };
}

// ============================================
//  دوال localStorage — التقدّم اللحظي داخل الدرس
// ============================================

/**
 * حفظ التقدّم اللحظي داخل الدرس
 * @param {string} lessonId
 * @param {object} state - { currentStage, currentQuestion, answers: [...] }
 */
export function saveLessonLocalProgress(lessonId, state) {
  try {
    const key = `zubad_progress_${lessonId}`;
    const data = {
      ...state,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('[local] save failed:', error);
    return false;
  }
}

/**
 * استعادة التقدّم اللحظي
 */
export function getLessonLocalProgress(lessonId) {
  try {
    const key = `zubad_progress_${lessonId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // التقدّم صالح لمدة ٧ أيام
    const savedAt = new Date(data.savedAt);
    const daysSince = (Date.now() - savedAt) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * مسح التقدّم اللحظي (عند إنهاء الدرس)
 */
export function clearLessonLocalProgress(lessonId) {
  try {
    const key = `zubad_progress_${lessonId}`;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * مسح كل التقدّم المحلي
 */
export function clearAllLocalProgress() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('zubad_progress_')) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================
//  دوال أدوات التطوير (للاختبار)
// ============================================

/**
 * ⚠️ للاختبار فقط — مسح كل تقدّم المستخدم
 */
export async function resetAllProgress() {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'لازم تسجّل دخول' };

  try {
    const userRef = doc(db, "users", user.uid);

    // مسح ملخّص التقدّم
    await updateDoc(userRef, {
      progress: {
        completedLessons: [],
        currentLesson: 'lesson-01',
        totalQuestionsSolved: 0,
        totalCorrectAnswers: 0,
        totalMistakes: 0,
        lastStudyDate: null
      },
      weaknesses: {}
    });

    // مسح تفاصيل كل الدروس
    const progressSnapshot = await getDocs(
      collection(db, "users", user.uid, "lessonProgress")
    );

    const deletions = [];
    progressSnapshot.forEach(docSnap => {
      deletions.push(setDoc(docSnap.ref, {}, { merge: false }));
    });
    await Promise.all(deletions);

    // مسح localStorage
    clearAllLocalProgress();

    return { success: true };
  } catch (error) {
    console.error('[firestore] resetAllProgress error:', error);
    return { success: false, error: error.message };
  }
}
