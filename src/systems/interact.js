// M8-03: tương tác "đi tới + E" dùng chung cho sảnh tông môn. Thuần logic (không DOM) để test bằng node.
// Điểm tương tác: { id, name, x, y, r, actions: [{ id, label, run }] , when?() } — `when` (tùy chọn) trả false thì bỏ qua điểm.
// nearestPoint: điểm gần chân người chơi nhất trong bán kính r của nó; hòa khoảng cách thì giữ điểm đang chọn (không nhảy qua lại).

export function nearestPoint(points, x, y, current = null) {
  let best = null, bd = Infinity;
  for (const pt of points) {
    if (pt.when && !pt.when()) continue;
    const d = Math.hypot(x - pt.x, y - pt.y);
    if (d > pt.r) continue;
    const score = d - (current && pt.id === current.id ? 4 : 0);   // ưu tiên nhẹ điểm đang chọn
    if (score < bd) { bd = score; best = pt; }
  }
  return best;
}

// E: một hành động thì chạy luôn; nhiều hành động thì gọi choose(point) để mở bảng chọn. Trả true nếu đã xử lý.
// Khóa chống bấm dồn: lần E kế tiếp trong `lockMs` bị bỏ qua.
export function makeInteractor({ lockMs = 250, now = () => Date.now() } = {}) {
  let last = -Infinity;
  return {
    press(point, choose) {
      if (!point) return false;
      const t = now(); if (t - last < lockMs) return true; last = t;
      const acts = point.actions.filter(a => !a.when || a.when());
      if (!acts.length) return false;
      if (acts.length === 1) acts[0].run(); else choose(point, acts);
      return true;
    },
  };
}
