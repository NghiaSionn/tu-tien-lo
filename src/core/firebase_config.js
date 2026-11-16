// M9: cấu hình dự án Firebase (đăng nhập Google/email + lưu tiến độ lên Firestore). Lấy trong Firebase Console ->
// Project settings -> Your apps -> Web app -> SDK setup (Config). Các giá trị này là định danh công khai của web app
// (không phải mật khẩu); dữ liệu được bảo vệ bằng Firestore Security Rules (docs/firebase/firestore.rules).
// Để null -> tắt hẳn đăng nhập, game chơi khách như cũ.
export const FIREBASE = null;
// Ví dụ:
// export const FIREBASE = {
//   apiKey: '...', authDomain: 'ten-du-an.firebaseapp.com', projectId: 'ten-du-an',
//   storageBucket: 'ten-du-an.appspot.com', messagingSenderId: '...', appId: '...',
// };
