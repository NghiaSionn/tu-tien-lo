// M7-06 [GIẢ THUYẾT H1]: 3 gợi ý ngắn theo ngữ cảnh, không chặn. Chỉ cho người chưa chơi lượt nào (hoặc tự bật lại trong Cài đặt).
// Trạng thái lưu ở meta.tutorial = { seen: [id], off: bool, replay: bool }. Thuần logic.
export const TIPS = {
  portal: {
    desktop: 'Đi bằng WASD / mũi tên tới cổng xoáy tím phía trên tụ linh trận, rồi nhấn E để vào bí cảnh.',
    touch: 'Kéo ngón tay ở nửa trái màn hình để đi tới cổng xoáy tím phía trên tụ linh trận, rồi chạm nút E.',
  },
  move: {
    desktop: 'Công pháp tự đánh yêu thú trong tầm. Bạn chỉ cần di chuyển: né vùng/đường đỏ (sắp bị đánh) và nhặt viên chiến ý xanh để lên cấp.',
    touch: 'Công pháp tự đánh yêu thú trong tầm. Bạn chỉ cần kéo để di chuyển: né vùng/đường đỏ (sắp bị đánh) và nhặt viên chiến ý xanh để lên cấp.',
  },
  card: {
    desktop: 'Lên cấp: chọn 1 thẻ (phím 1–3) — công pháp mới, nâng cấp, hoặc bị động. Dòng ★ cho biết cách tiến hóa công pháp đó.',
    touch: 'Lên cấp: chạm 1 thẻ — công pháp mới, nâng cấp, hoặc bị động. Dòng ★ cho biết cách tiến hóa công pháp đó.',
  },
};
export const TIP_IDS = Object.keys(TIPS);

export const defaultTutorial = () => ({ seen: [], off: false, replay: false });

const st = meta => meta.tutorial || (meta.tutorial = defaultTutorial());

// Có nên hiện gợi ý id không
export function shouldTip(meta, id) {
  const t = st(meta);
  if (!TIPS[id] || t.off || t.seen.includes(id)) return false;
  return meta.stats.runs === 0 || t.replay;
}
export const tipText = (id, touch) => TIPS[id][touch ? 'touch' : 'desktop'];

export function markSeen(meta, id) {
  const t = st(meta);
  if (!t.seen.includes(id)) t.seen.push(id);
  if (TIP_IDS.every(x => t.seen.includes(x))) t.replay = false;
}
export function skipAll(meta) { st(meta).off = true; st(meta).replay = false; }
export function replayTutorial(meta) { meta.tutorial = { seen: [], off: false, replay: true }; }

// cho save.js: chỉ giữ id đã biết
export const sanitizeTutorial = src => (src && typeof src === 'object')
  ? { seen: Array.isArray(src.seen) ? [...new Set(src.seen.filter(id => TIPS[id]))] : [], off: src.off === true, replay: src.replay === true }
  : defaultTutorial();
