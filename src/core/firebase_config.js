// M9: cấu hình dự án Firebase (đăng nhập Google/email + lưu tiến độ lên Firestore). Lấy trong Firebase Console ->
// Project settings -> Your apps -> Web app -> SDK setup (Config). Các giá trị này là định danh công khai của web app
// (không phải mật khẩu); dữ liệu được bảo vệ bằng Firestore Security Rules (docs/firebase/firestore.rules).
// Để null -> tắt hẳn đăng nhập, game chơi khách như cũ.
export const FIREBASE = {   // dự án Firebase "tu-tien-lo" (17/11/2026)
  apiKey: 'AIzaSyA_OAB5VJ6qc6YbNjqCwNfoJ_4_JdPLyEk',
  authDomain: 'tu-tien-lo.firebaseapp.com',
  projectId: 'tu-tien-lo',
  storageBucket: 'tu-tien-lo.firebasestorage.app',
  messagingSenderId: '889587264507',
  appId: '1:889587264507:web:b6e158306bd9be522b795e',
};
// Ví dụ:
// export const FIREBASE = {
//   apiKey: '...', authDomain: 'ten-du-an.firebaseapp.com', projectId: 'ten-du-an',
//   storageBucket: 'ten-du-an.appspot.com', messagingSenderId: '...', appId: '...',
// };
