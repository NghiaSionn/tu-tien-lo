# M8 — Sảnh tông môn: quyết định đã chốt (13/11/2026)

Nguồn: thiết kế ChatGPT `docs/chatgpt_tong_mon_M8_2026-11-13.md` (chưa duyệt toàn bộ backlog), hai concept ảnh trong `docs/concept/`.

## Đã chốt (người phát triển, 13/11)
- **Phong cách art = ảnh 2** (`docs/concept/tong_mon_chatgpt_2.png`).
  - Ảnh này được vẽ trong chat ChatGPT **"Vẽ concept art nhân vật"** (project GameWeb), nơi đã có các sheet sprite cũ làm ngữ cảnh, nên cổng, bia và nhân vật đồng bộ với art trong game.
  - Mọi công trình/asset tông môn tiếp theo vẽ trong **chat đó** để giữ phong cách.
- **Bố cục = ảnh 1** (`docs/concept/tong_mon_chatgpt.png`): gọn, các khu sát quanh quảng trường, đi bộ ít.
  - Ảnh so sánh: `docs/concept/tong_mon_so_sanh.png`.

## Bố cục theo ảnh 1 (vị trí tương đối quanh quảng trường trung tâm)
```
                    [Cổng Bí Cảnh]                         (Bắc)
 [Truyền Thừa Các — tháp]                 [Luyện Khí Phường]
 [Tàng Kinh Các]        [TỤ LINH PHÁP ĐÀI]      [Đan Dược Phòng]
 [Công Đức Đường]                         [Luyện Võ Trường — sói]
                   [Vườn Bia Truyền Thừa]   suối · cầu đá  (Nam)
```
- **8 khu chức năng** theo thiết kế ChatGPT, cộng **Luyện Võ Trường** có trong cả hai ảnh. Đề xuất giữ khu này làm chỗ thử đòn đánh với sói, thay sói hoang đi lại trong động phủ cũ; chưa chốt.
- Tên tông môn ChatGPT đề xuất: **Thanh Huyền Tông** (chưa chốt chính thức).

## Chưa chốt / chờ duyệt
- Bắt đầu backlog M8 (M8-01 audit) — theo CLAUDE.md, thay đổi kiến trúc lớn phải được duyệt.
- Có NPC đệ tử đi lại (ảnh 2 có) hay không; ChatGPT khuyên chưa cần NPC phức tạp.

## Cập nhật 13/11 (sau M8-02) — hoàn thiện sảnh trước
- Người phát triển: **bám sát 100% concept ảnh 1** cho công trình, đồ vật, cây (thay quyết định "phong cách ảnh 2" cho phần sảnh). Giữ nguyên cổng bí cảnh và tụ linh trận hiện có.
- **Tông môn phải rộng hơn hẳn** (bản M8-02 quá ngắn, 1,8–3,6 s giữa các khu).
- **Asset đã tách** (vẽ trong chat "Vẽ concept art tông môn", nơi có ảnh 1 trong ngữ cảnh):
  - `docs/concept/tong_mon_cong_trinh_chatgpt.png` → `sprites/tm_cong_trinh.*` (6 công trình: truyen_thua, tang_kinh, cong_duc, luyen_khi, dan_duoc, luyen_vo);
  - `docs/concept/tong_mon_do_vat_chatgpt.png` → `sprites/tm_do_vat.*` (den_da, co_phuon, lan_can, bac_thang, cau_da, hang_rao, cong_rao, moc_nhan, gia_binh_khi, bia_lon, bia_nho, thac_nuoc);
  - `docs/concept/tong_mon_cay_da_chatgpt.png` → `sprites/tm_cay_da.*` (anh_dao_lon, anh_dao_nho, tung_bonsai, tung_cao, cay_tron, tre, bui_cay, khom_hoa, da_lon, da_nho, vach_da, sen).
  - Làm sạch: `tools/sprite_clean.py --scale 4`. Xem trước: `docs/concept/tong_mon_sprite_da_lam_sach.png`.
