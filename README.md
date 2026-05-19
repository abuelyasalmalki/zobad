# 🔥 Firebase Integration — حزمة الربط

## 📂 الملفات في هذي الحزمة

```
firebase-package/
├── README.md              ← هذا الملف
├── signup.html            ← صفحة التسجيل (محدّثة)
├── login.html             ← صفحة الدخول (محدّثة)
├── forgot.html            ← نسيت كلمة المرور (محدّثة)
├── dashboard.html         ← لوحة الطالب (محدّثة)
└── assets/
    └── js/
        ├── firebase-config.js   ← إعدادات Firebase (جديد)
        └── auth.js              ← دوال المصادقة (جديد)
```

---

## 🚀 خطوات التنصيب على GitHub

### **١. ارفع الملفات على GitHub في repo زُبَد (zobad)**

كل ملف يروح لمكانه:

| الملف | المكان على GitHub |
|---|---|
| `signup.html` | الجذر (يستبدل الموجود) |
| `login.html` | الجذر (يستبدل الموجود) |
| `forgot.html` | الجذر (يستبدل الموجود) |
| `dashboard.html` | الجذر (يستبدل الموجود) |
| `firebase-config.js` | `assets/js/firebase-config.js` (جديد) |
| `auth.js` | `assets/js/auth.js` (جديد) |

### **٢. تأكّد من بنية المجلدات على GitHub**

بعد الرفع، لازم تكون:

```
zobad/
├── index.html
├── signup.html        ← المحدّث
├── login.html         ← المحدّث
├── forgot.html        ← المحدّث
├── dashboard.html     ← المحدّث
├── curriculum.html
├── about.html
└── assets/
    ├── images/
    │   └── logo.svg
    └── js/             ← جديد
        ├── firebase-config.js
        └── auth.js
```

### **٣. انتظر دقيقتين**

GitHub Pages يحدّث الموقع تلقائياً.

---

## 🧪 الاختبار

### **الاختبار ١: التسجيل**

1. افتح `abuelyasalmalki.github.io/zobad/signup.html`
2. اكتب اسم، إيميل، كلمة مرور (٨ أحرف+)
3. علّم على الشروط
4. اضغط "إنشاء حسابي"
5. لو نجح → تنتقل لـ `dashboard.html` تلقائياً
6. لو فشل → رسالة خطأ بالعربي

**تحقّق في Firebase:**
- ادخل Firebase Console → Authentication → Users
- لازم تشوف الإيميل اللي سجّلته
- ادخل Firestore Database → users → لازم تشوف document للمستخدم

### **الاختبار ٢: الدخول**

1. اضغط تسجيل خروج من Dashboard
2. ادخل `login.html`
3. اكتب نفس الإيميل وكلمة المرور
4. لازم تدخل Dashboard بنجاح

### **الاختبار ٣: Google Sign-in**

1. ادخل `signup.html` أو `login.html`
2. اضغط زر Google
3. اختار حساب Google
4. لازم تنتقل Dashboard

### **الاختبار ٤: نسيت كلمة المرور**

1. ادخل `forgot.html`
2. اكتب إيميل مسجّل
3. اضغط "أرسل رابط الاستعادة"
4. تطلع شاشة النجاح
5. تحقّق من بريدك (وSpam) — لازم يجي إيميل من Firebase

### **الاختبار ٥: حماية Dashboard**

1. سجّل خروج (Logout)
2. حاول تفتح `dashboard.html` مباشرة
3. لازم يرجّعك للـ login تلقائياً

---

## ⚠️ مشاكل شائعة وحلولها

### **١. "Firebase: Error (auth/operation-not-allowed)"**

السبب: ما فعّلت طريقة الدخول في Firebase Console.

الحل:
- Firebase Console → Authentication → Sign-in method
- فعّل Email/Password و Google

### **٢. "auth/unauthorized-domain"**

السبب: GitHub Pages domain غير مضاف للنطاقات المخوّلة.

الحل:
- Firebase Console → Authentication → Settings → Authorized domains
- Add domain: `abuelyasalmalki.github.io`

### **٣. الصفحة فاضية / Console يطلع أخطاء "Module not found"**

السبب: الملفات في مسار خطأ.

الحل: تأكّد من بنية المجلدات أعلاه. `firebase-config.js` و `auth.js` لازم يكونان في `assets/js/`.

### **٤. Google Sign-in popup يطلع ثم يقفل**

السبب: المتصفح يمنع النوافذ المنبثقة.

الحل: اسمح للنوافذ المنبثقة في إعدادات المتصفح.

### **٥. "Missing or insufficient permissions" (Firestore)**

السبب: Security Rules غير صحيحة.

الحل: تأكّد إنك نشرت الـ Rules اللي عطيتك في Firestore Database → Rules.

---

## 🎯 ماذا يفعل كل ملف؟

### **`firebase-config.js`**
- يربط الموقع بـ Firebase
- يستخدم Firebase SDK v10 عبر CDN (بدون npm)
- يصدّر `auth`, `db`, `googleProvider`

### **`auth.js`**
دوال جاهزة للاستخدام:
- `signUpWithEmail(email, password, name)` — تسجيل جديد
- `signInWithEmail(email, password)` — دخول
- `signInWithGoogle()` — دخول/تسجيل عبر Google
- `logOut()` — تسجيل خروج
- `resetPassword(email)` — استعادة كلمة المرور
- `watchAuthState(callback)` — مراقبة حالة المستخدم
- `getUserData(userId)` — قراءة بيانات المستخدم

### **`signup.html`**
- يستخدم Firebase لإنشاء حساب جديد
- يحفظ بيانات المستخدم في Firestore تلقائياً
- ينتقل لـ Dashboard بعد النجاح

### **`login.html`**
- يستخدم Firebase للدخول
- يحدّث `lastLogin` في Firestore
- ينتقل لـ Dashboard

### **`forgot.html`**
- يرسل إيميل استعادة فعلي من Firebase
- يعرض شاشة نجاح بعد الإرسال

### **`dashboard.html`**
- محمي — يرجّع غير المسجّلين للدخول
- يقرأ بيانات المستخدم من Firestore
- يعرض الاسم، حالة الاشتراك، التقدّم
- زر تسجيل خروج بالضغط على بطاقة المستخدم

---

## 🛡️ الأمان

- ✅ كلمات المرور تُحفظ مشفّرة في Firebase (لا تُخزّن نص صريح)
- ✅ كل مستخدم يقدر يصل لبياناته فقط (Firestore Rules)
- ✅ Authorized domains تمنع المواقع الأخرى من الاتصال بـ Firebase
- ✅ Firebase API key آمنة في الـ frontend (محمية بـ Authorized domains + Rules)

---

## 📊 هيكل البيانات في Firestore

```
firestore/
└── users/
    └── {userId}/
        ├── uid: string
        ├── name: "محمد العتيبي"
        ├── email: "..."
        ├── photoURL: string | null
        ├── createdAt: timestamp
        ├── lastLogin: timestamp
        ├── subscription: {
        │     status: "free" | "paid" | "expired"
        │     paidAt: timestamp | null
        │     expiresAt: timestamp | null
        │     amount: 0
        │   }
        └── progress: {
              currentLesson: 1,
              completedLessons: [],
              totalQuestionsSolved: 0,
              lastStudyDate: timestamp | null
            }
```
