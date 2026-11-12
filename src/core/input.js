// Bàn phím. Phím chỉ nhấn rất nhanh (xuống và lên trong cùng một khung) vẫn được tính ít nhất một khung.
const MOVE = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'attack', KeyJ: 'attack' };

export function makeInput(onAction) {
  const keys = {}, seen = {}, release = {};
  const clear = () => { for (const k in keys) keys[k] = false; for (const k in release) delete release[k]; virt = {}; };
  function onKeyDown(e) {
    // chỉ nhường phím cho ô nhập chữ; ô tích/nút vẫn để game nhận Esc, số...
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !/checkbox|radio|button|file/.test(t.type)))) return;
    if (t && t.blur && t.tagName === 'INPUT') t.blur();
    const k = MOVE[e.code];
    if (k) {
      e.preventDefault();
      if (e.repeat) return;
      // M7-02: phím tắt UI (J thành tựu, Space quay/đóng, D độ khó…) được xét trước; nhận rồi thì không thành di chuyển/đánh
      if (onAction(e.code, e) === true) return;
      if (!keys[k]) { keys[k] = true; seen[k] = false; delete release[k]; }
      return;
    }
    if (e.repeat) return;
    if (onAction(e.code, e) === true) e.preventDefault();
  }
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', e => {
    const k = MOVE[e.code];
    if (!k) return;
    if (seen[k]) keys[k] = false; else release[k] = true;
  });
  addEventListener('blur', clear);
  // M5-06: joystick ảo — dirs {up,down,left,right} hoặc null (thả tay). Dùng chung cơ chế "giữ ít nhất 1 khung".
  let virt = {};
  function setVirtual(dirs) {
    for (const k of ['up', 'down', 'left', 'right']) {
      const on = !!(dirs && dirs[k]);
      if (on && !virt[k]) { keys[k] = true; seen[k] = false; delete release[k]; }
      else if (!on && virt[k]) { if (seen[k]) keys[k] = false; else release[k] = true; }
      virt[k] = on;
    }
  }
  return {
    keys,
    onKeyDown,   // để test gọi trực tiếp
    setVirtual,
    clear,
    // gọi cuối mỗi khung
    endFrame() {
      for (const k in keys) if (keys[k]) seen[k] = true;
      for (const k in release) { keys[k] = false; delete release[k]; }
    },
  };
}
