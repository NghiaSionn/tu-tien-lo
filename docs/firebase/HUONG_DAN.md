# Bật đăng nhập (Google + email) và lưu tiến độ lên mây — Firebase

Code đã sẵn (M9, 17/11/2026). Chỉ cần tạo dự án Firebase miễn phí (gói Spark) và dán cấu hình vào game. Chưa dán thì game chơi khách như cũ.

## 1. Tạo dự án
1. Vào https://console.firebase.google.com → **Add project** → đặt tên (ví dụ `tu-tien-lo`) → có thể tắt Google Analytics → **Create**.
2. Trong dự án: biểu tượng **</>** (Add app → Web) → đặt tên `tu-tien-lo-web` → **Register app**. Không cần Firebase Hosting.
3. Firebase hiện đoạn `const firebaseConfig = { apiKey: ..., authDomain: ..., projectId: ..., storageBucket: ..., messagingSenderId: ..., appId: ... }` — giữ lại để dán ở bước 5.

## 2. Bật cách đăng nhập
**Build → Authentication → Get started → Sign-in method**:
- **Google** → Enable → chọn email hỗ trợ → Save.
- **Email/Password** → Enable (chỉ mục đầu, không cần "Email link") → Save.

**Authentication → Settings → Authorized domains** → **Add domain**: `nghiasionn.github.io` (link chơi thử). `localhost` đã có sẵn.

## 3. Tạo cơ sở dữ liệu
**Build → Firestore Database → Create database** → chọn vị trí gần (ví dụ `asia-southeast1`) → **Start in production mode**.

## 4. Dán quy tắc bảo mật
Firestore → tab **Rules** → xóa hết, dán nội dung tệp `docs/firebase/firestore.rules` → **Publish**.
Quy tắc này: mỗi người chỉ đọc/ghi được đúng một tài liệu `saves/<mã người dùng>` của mình, giới hạn kích thước; mọi thứ khác bị chặn.

## 5. Dán cấu hình vào game
Mở `src/core/firebase_config.js`, thay `export const FIREBASE = null;` bằng:
```js
export const FIREBASE = {
  apiKey: '...', authDomain: '....firebaseapp.com', projectId: '...',
  storageBucket: '....appspot.com', messagingSenderId: '...', appId: '...',
};
```
Các giá trị này là định danh công khai của web app (Firebase thiết kế để nằm trong code web), không phải mật khẩu — dữ liệu được bảo vệ bằng quy tắc ở bước 4. Rồi commit + push như thường lệ (hoặc gửi đoạn config cho Claude dán giúp).

## Cách hoạt động trong game
- **Cài đặt → Tài khoản**: Đăng nhập bằng Google, hoặc email + mật khẩu (Đăng ký / Đăng nhập / Quên mật khẩu). Đăng ký email sẽ được gửi thư xác minh.
- Không đăng nhập vẫn chơi khách, lưu trong trình duyệt như cũ.
- Khi đăng nhập: so bản trên máy và bản trên mây, **giữ bản tiến xa hơn** (cảnh giới → tu vi → số lượt bí cảnh → linh thạch). Bản trên mây thắng thì được tải khi bạn đang ở sảnh (không thay giữa bí cảnh/thiên kiếp); bản trên máy cũ được chép sang ô dự phòng `tutien_save_v2_cloud_bak`.
- Sau đó tự lưu lên mây tối đa mỗi 30 giây khi có thay đổi, khi đăng xuất và khi rời trang. Nút **Đồng bộ ngay** để ép lưu.
- Khóa `tutien_save_v1` (save v0.1) không bao giờ bị ghi hay xóa.

## Giới hạn hiện tại
- Không chống gian lận: người chơi có thể sửa save của chính mình (giống lưu trên máy). Chưa có bảng xếp hạng nên chưa cần; nếu sau này làm bảng xếp hạng thì phải xác thực phía máy chủ.
- Hạn mức miễn phí Firestore (50.000 lượt đọc / 20.000 lượt ghi mỗi ngày) dư cho vài trăm người chơi với nhịp lưu 30 giây.
