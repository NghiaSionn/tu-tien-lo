// Điều khiển cảm ứng (M5-06): joystick ảo nổi — đặt ngón ở nửa trái khung game để di chuyển; nút E (tương tác) góc phải.
// Hướng joystick chuyển thành 4 phím WASD qua input.setVirtual, nên mọi logic game dùng chung với bàn phím.
// Chỉ bật trên thiết bị cảm ứng (pointer: coarse) hoặc khi mở với ?touch=1. Chưa thử trên máy thật: NOT VERIFIED ON REAL DEVICE.
const DEAD = 0.28;   // vùng chết của joystick (tỉ lệ bán kính)

// Hướng cần (dx, dy) -> 4 phím; tách riêng để test
export function dirsFromVector(dx, dy, radius) {
  const l = Math.hypot(dx, dy);
  if (l < radius * DEAD) return { up: false, down: false, left: false, right: false };
  const nx = dx / l, ny = dy / l;
  return { right: nx > 0.38, left: nx < -0.38, down: ny > 0.38, up: ny < -0.38 };
}

export const touchWanted = () => typeof window !== 'undefined' &&
  (new URLSearchParams(location.search).get('touch') === '1' || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));

export function setupTouch(canvas, input, onAction) {
  if (!touchWanted()) return null;
  const wrap = canvas.parentNode;
  const base = document.createElement('div'), knob = document.createElement('div'), btnE = document.createElement('button');
  base.id = 'joyBase'; knob.id = 'joyKnob'; btnE.id = 'touchE'; btnE.textContent = 'E';
  base.appendChild(knob); wrap.appendChild(base); wrap.appendChild(btnE);
  base.hidden = true;
  let pid = null, ox = 0, oy = 0;
  const R = () => base.offsetWidth / 2 || 40;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    if (pid !== null || e.clientX - r.left > r.width * 0.6) return;   // chỉ nửa trái
    pid = e.pointerId; ox = e.clientX; oy = e.clientY;
    const wr = wrap.getBoundingClientRect();
    base.style.left = (ox - wr.left - R()) + 'px'; base.style.top = (oy - wr.top - R()) + 'px'; base.hidden = false;
    knob.style.transform = 'translate(0px, 0px)';
    canvas.setPointerCapture(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const l = Math.hypot(dx, dy), r = R();
    if (l > r) { dx = dx / l * r; dy = dy / l * r; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.setVirtual(dirsFromVector(dx, dy, r));
    e.preventDefault();
  });
  const end = e => { if (e.pointerId !== pid) return; pid = null; base.hidden = true; input.setVirtual(null); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  btnE.addEventListener('pointerdown', e => { e.preventDefault(); onAction('KeyE'); });
  document.body.classList.add('touch');
  return { base, btnE };
}
