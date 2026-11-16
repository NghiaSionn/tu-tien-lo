// M9: đăng nhập (Google / email) + lưu tiến độ lên Firestore. Tùy chọn: chưa cấu hình hoặc chưa đăng nhập = chơi khách như cũ.
// SDK Firebase tải động từ gstatic chỉ khi đã cấu hình (người chơi khách không tải gì thêm).
// Firestore: saves/{uid} = { save: <chuỗi JSON định dạng v2 như localStorage>, savedAt, realm, v }. Quyền: docs/firebase/firestore.rules
import { FIREBASE } from '../core/firebase_config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
let F = null, auth = null, db = null;

export const cloudConfigured = () => !!(FIREBASE && FIREBASE.apiKey && FIREBASE.projectId);

// Lỗi Firebase -> câu tiếng Việt dễ hiểu
const MSG = {
  'auth/invalid-email': 'Email không hợp lệ.', 'auth/missing-password': 'Chưa nhập mật khẩu.',
  'auth/weak-password': 'Mật khẩu cần ít nhất 6 ký tự.', 'auth/email-already-in-use': 'Email này đã có tài khoản — hãy đăng nhập.',
  'auth/invalid-credential': 'Sai email hoặc mật khẩu.', 'auth/wrong-password': 'Sai email hoặc mật khẩu.', 'auth/user-not-found': 'Sai email hoặc mật khẩu.',
  'auth/too-many-requests': 'Thử quá nhiều lần, đợi một lúc rồi thử lại.', 'auth/network-request-failed': 'Mất mạng, kiểm tra kết nối.',
  'auth/popup-closed-by-user': 'Đã đóng cửa sổ đăng nhập.', 'auth/unauthorized-domain': 'Tên miền này chưa được cho phép trong Firebase (Authentication -> Settings -> Authorized domains).',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Cấu hình Firebase sai (apiKey) — kiểm tra src/core/firebase_config.js.',
  'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase (Authentication -> Sign-in method).',
  'permission-denied': 'Không có quyền ghi dữ liệu (kiểm tra Firestore Rules).',
};
export const errText = e => MSG[e && e.code] || (e && e.message) || String(e);

// onUser(user|null) gọi mỗi khi trạng thái đăng nhập đổi (kể cả lúc mở game đã đăng nhập sẵn)
export async function initCloud(onUser) {
  if (!cloudConfigured()) return false;
  const [app, a, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  F = { ...a, ...fs };
  const inst = app.initializeApp(FIREBASE);
  auth = a.getAuth(inst); db = fs.getFirestore(inst);
  a.onAuthStateChanged(auth, u => onUser(u ? { uid: u.uid, email: u.email, name: u.displayName, verified: u.emailVerified, google: u.providerData.some(p => p.providerId === 'google.com') } : null));
  a.getRedirectResult(auth).catch(() => {});   // đăng nhập kiểu chuyển trang (khi popup bị chặn)
  return true;
}

export async function signInGoogle() {
  const p = new F.GoogleAuthProvider();
  try { await F.signInWithPopup(auth, p); }
  catch (e) { if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') await F.signInWithRedirect(auth, p); else throw e; }
}
const need = (email, pass) => { if (!email.trim()) throw { code: 'auth/invalid-email' }; if (pass !== undefined && !pass) throw { code: 'auth/missing-password' }; };
export const signInEmail = async (email, pass) => { need(email, pass); await F.signInWithEmailAndPassword(auth, email.trim(), pass); };
export async function signUpEmail(email, pass) { need(email, pass); const c = await F.createUserWithEmailAndPassword(auth, email.trim(), pass); try { await F.sendEmailVerification(c.user); } catch (e) { /* không chặn */ } }
export const resetPassword = email => F.sendPasswordResetEmail(auth, email.trim());
export const signOutCloud = () => F.signOut(auth);

// Đọc bản trên mây: chuỗi save hoặc null
export async function pullSave(uid) {
  const snap = await F.getDoc(F.doc(db, 'saves', uid));
  return snap.exists() && typeof snap.data().save === 'string' ? snap.data().save : null;
}
export async function pushSave(uid, raw, realm) {
  await F.setDoc(F.doc(db, 'saves', uid), { save: raw, savedAt: F.serverTimestamp(), realm: realm | 0, v: 2 });
}
