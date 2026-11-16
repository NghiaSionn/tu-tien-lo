// M9: màn đăng nhập chạy NGAY khi mở trang (không chờ game tải ảnh/âm thanh). Chỉ phụ thuộc cloud.js + cấu hình Firebase.
// Game (main.js) tải song song phía sau; khi người chơi vào (đăng nhập / chơi khách) mà game chưa xong thì hiện "Đang vào tông môn…".
// Giao tiếp với main.js qua window.__login: isOpen(), show() (sau khi đăng xuất), onDone (main gán để mở khóa điều khiển).
import { cloudConfigured, initCloud, onAuth, signInGoogle, signInEmail, signUpEmail, resetPassword, errText } from '../persistence/cloud.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const G_ICON = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.2l7.8 6C12.3 13.3 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.8c-.5-1.4-.8-3-.8-4.8s.3-3.3.8-4.8l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-3.8-13.6-9.3l-7.8 6C6.6 42.6 14.6 48 24 48z"/></svg>';

const S = { open: false, checking: true, busy: false, entering: false, status: '', email: '' };
let el = document.getElementById('login');   // có sẵn trong index.html

function draw() {
  if (!el) return;
  const dis = S.busy || S.checking ? 'disabled' : '';
  let body;
  if (S.entering) body = '<p class="st">Đang vào tông môn…</p>';
  else if (S.checking) body = '<p class="st">Đang kiểm tra đăng nhập…</p>';
  else body = `
    <button class="google" data-a="google" ${dis}>${G_ICON} Đăng nhập bằng Google</button>
    <div class="or">hoặc email</div>
    <input id="lgEmail" type="email" placeholder="Email" autocomplete="email" value="${esc(S.email)}">
    <input id="lgPass" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="current-password">
    <div class="two"><button data-a="in" ${dis}>Đăng nhập</button><button data-a="up" ${dis}>Đăng ký</button></div>
    <button class="link" data-a="reset" ${dis}>Quên mật khẩu?</button>
    <div class="or">hoặc</div>
    <button class="guest" data-a="guest" ${dis}>Chơi khách (lưu trên máy này)</button>
    <p class="st">${esc(S.status)}</p>
    <p class="note">Đăng nhập để lưu tiến độ lên mây và chơi tiếp trên máy khác. Có thể đăng nhập sau trong Cài đặt.</p>`;
  el.innerHTML = `<div class="card"><h1>Tu Tiên Lộ</h1><p class="tag">THANH HUYỀN TÔNG</p>${body}</div>`;
  const em = el.querySelector('#lgEmail'), pw = el.querySelector('#lgPass');
  el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(b.dataset.a, em ? em.value : '', pw ? pw.value : '')));
  if (pw) pw.addEventListener('keydown', e => { if (e.key === 'Enter') act('in', em.value, pw.value); });
}

async function act(a, email, pass) {
  S.email = email;
  if (a === 'guest') { done(); return; }
  if (S.busy) return;
  S.busy = true; S.status = 'Đang xử lý…'; draw();
  try {
    if (a === 'google') await signInGoogle();
    else if (a === 'in') await signInEmail(email, pass);
    else if (a === 'up') { await signUpEmail(email, pass); S.status = 'Đã tạo tài khoản — kiểm tra email để xác minh.'; }
    else if (a === 'reset') { if (!email.trim()) throw { code: 'auth/invalid-email' }; await resetPassword(email); S.status = 'Đã gửi email đặt lại mật khẩu.'; }
    if (a === 'google' || a === 'in') S.status = '';
  } catch (e) { S.status = errText(e); }
  S.busy = false; if (S.open && !S.entering) draw();
}

// vào game: game đã tải xong -> đóng ngay; chưa -> giữ màn với chữ "Đang vào tông môn…" tới khi main.js sẵn sàng
function done() {
  S.entering = true; draw();
  const finish = () => {
    if (!window.__game) { setTimeout(finish, 150); return; }
    S.open = false; S.entering = false; el.hidden = true; el.innerHTML = '';
    if (window.__login.onDone) window.__login.onDone();
  };
  finish();
}

function show(checking = false) {
  if (!el) { el = document.createElement('div'); el.id = 'login'; document.body.appendChild(el); }
  S.open = true; S.checking = checking; S.entering = false; S.busy = false; S.status = ''; el.hidden = false; draw();
}

window.__login = { isOpen: () => S.open, show: () => show(false), onDone: null };

if (!cloudConfigured() && el) { el.remove(); el = null; }   // chưa bật đăng nhập: vào game như cũ
if (cloudConfigured()) {
  const ld = document.getElementById('loading'); if (ld) ld.remove();
  show(true);
  onAuth(u => {
    if (!S.open) return;
    S.checking = false;
    if (u) done(); else draw();
  });
  initCloud().catch(e => { S.checking = false; S.status = 'Không kết nối được máy chủ đăng nhập (' + errText(e) + ') — có thể chơi khách.'; draw(); });
}
