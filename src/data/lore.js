// M7-14 [GIẢ THUYẾT H8]: Bia Truyền Thừa — mẩu truyện ngắn mở một lần theo mốc. Mỗi đoạn ≤ 80 từ (có test).
// when(meta, ev): điều kiện đọc từ meta (đã cộng thưởng) và sự kiện vừa xảy ra (ev.outcome của lượt vừa xong, nếu có). Thứ tự = thứ tự hiển thị trên bia.
export const LORE = [
  {
    id: 'first_run', title: 'Vết chân đầu tiên',
    when: m => m.stats.runs >= 1,
    text: 'Cổng xoáy tím ấy đã có từ trước khi động phủ được dựng. Tổ sư để lại một dòng: "Rừng Linh Thú không giết người tu, chỉ thử họ." Ngươi đã bước vào và trở về. Bia đá khắc thêm một vết chân — vết đầu tiên sau rất nhiều năm im lặng.',
  },
  {
    id: 'first_loss', title: 'Ngã xuống không phải là hết',
    when: (m, ev) => ev?.outcome === 'LOSE',          // sự kiện: lượt vừa xong thua
    text: 'Linh khí của bí cảnh kéo người tu bị trọng thương về lại cổng, như sóng trả cánh lá về bờ. Tu vi không mất, cảnh giới không lùi. Tổ sư gọi đó là lòng nhân của trời đất, cũng là lời nhắc: thứ mất đi chỉ là một lần thử — còn đạo tâm thì phải tự giữ.',
  },
  {
    id: 'first_mini', title: 'Lang Vương cúi đầu',
    when: m => m.stats.minis >= 1,
    text: 'Lang Vương từng là thú hộ sơn của tông môn cũ. Khi tông môn tan, nó ở lại canh một khu rừng không còn ai để canh. Ngã xuống trước ngươi, nó không oán. Nơi nó nằm, Linh Mạch trào lên — món quà cuối cùng của kẻ giữ cửa cho người đi tiếp.',
  },
  {
    id: 'first_evo', title: 'Hai dòng chảy thành một',
    when: m => (m.stats.evos || []).length >= 1,
    text: 'Công pháp không phải viên gạch xếp chồng mà là dòng sông. Khi một môn luyện tới tận cùng và gặp đúng dòng khác, chúng hòa làm một và chảy theo hướng mới. Tổ sư chỉ ghi vài công thức lên bia, phần còn lại để người sau tự tìm — trong Đồ Giám vẫn còn chỗ trống.',
  },
  {
    id: 'first_win', title: 'Ma Ảnh tan',
    when: m => m.stats.wins >= 1,
    text: 'Ma Ảnh Yêu Vương không có xác. Nó là bóng của mọi linh thú chết oan trong rừng, gom lại thành hình. Hạ nó không phải giết, mà là giải. Khi bóng tan, rừng nhẹ đi một chút. Nhưng bóng sẽ lại tụ — chừng nào còn người tu bước vào và để lại oán khí.',
  },
  {
    id: 'truc_co', title: 'Đắp nền Trúc Cơ',
    when: m => m.realmLevel >= 9,
    text: 'Luyện Khí là gom nước, Trúc Cơ là đắp đê. Lôi kiếp đánh xuống không để trừng phạt, mà để thử xem đê có vững. Ngươi đã đứng giữa trận sét và không đổ. Từ nay linh khí không còn tràn mất; nó ở lại, thành nền cho mọi thứ sẽ xây lên sau này.',
  },
  {
    id: 'kim_dan', title: 'Hạt đan trong bụng',
    when: m => m.realmLevel >= 12,
    text: 'Người xưa nói: một viên Kim Đan nuốt vào bụng, mệnh ta do ta không do trời. Tổ sư viết thêm bên dưới, nét chữ nhỏ hơn: "Nhưng đan thành rồi mới biết, trời chưa từng giữ mệnh ai. Chỉ là trước đó ta chưa đủ sức cầm lấy." Bia còn nhiều chỗ trống phía dưới.',
  },
];
