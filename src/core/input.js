// Bàn phím. Phím chỉ nhấn rất nhanh (xuống và lên trong cùng một khung) vẫn được tính ít nhất một khung.
const MOVE = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'attack', KeyJ: 'attack' };

export function makeInput(onAction) {
  const keys = {}, seen = {}, release = {};
  const clear = () => { for (const k in keys) keys[k] = false; for (const k in release) delete release[k]; };
  addEventListener('keydown', e => {
    // chỉ nhường phím cho ô nhập chữ; ô tích/nút vẫn để game nhận Esc, số...
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !/checkbox|radio|button|file/.test(t.type)))) return;
    if (t && t.blur && t.tagName === 'INPUT') t.blur();
    const k = MOVE[e.code];
    if (k) {
      e.preventDefault();
      if (!keys[k]) { keys[k] = true; seen[k] = false; delete release[k]; }
      return;
    }
    if (e.repeat) return;
    if (onAction(e.code, e) === true) e.preventDefault();
  });
  addEventListener('keyup', e => {
    const k = MOVE[e.code];
    if (!k) return;
    if (seen[k]) keys[k] = false; else release[k] = true;
  });
  addEventListener('blur', clear);
  return {
    keys,
    clear,
    // gọi cuối mỗi khung
    endFrame() {
      for (const k in keys) if (keys[k]) seen[k] = true;
      for (const k in release) { keys[k] = false; delete release[k]; }
    },
  };
}
