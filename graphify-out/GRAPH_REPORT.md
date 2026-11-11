# Graph Report - GameWeb_TuTien  (2026-11-11)

## Corpus Check
- 106 files · ~107,467 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .LICENSE 1)

## Summary
- 1362 nodes · 2918 edges · 69 communities (61 shown, 8 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.85)
- Token cost: 469,861 input · 0 output

## Community Hubs (Navigation)
- Vòng lặp chính & điều khiển
- beanfx kit: hình khối (fxkit)
- Draft Lôi Cương: fxlib
- beanfx kit: fxlib
- beanfx kit: hướng (facing)
- beanfx kit: âm thanh tổng hợp
- Draft Lôi Cương: derive
- Vẽ khung & hiệu ứng (render)
- Draft Lôi Cương Hộ Thể
- Draft Lôi Cương: fxkit
- beanfx kit: sfx.py
- Game v0.1 (legacy)
- Draft Lôi Cương: caster
- beanfx kit: caster
- Draft Lôi Cương: pfx
- beanfx kit: pfx
- beanfx: va chạm & mảnh vỡ
- Draft Lôi Cương: export
- Yêu thú & vòng run
- Cảnh giới & tu luyện
- beanfx kit: export
- Save v2 & cài đặt
- beanfx kit: derive
- beanfx kit: ánh sáng
- Draft Lôi Cương: ánh sáng
- GDD: công pháp & thẻ
- Nhập sheet pixelfx
- Trình phát beanfx.js
- 5 VFX beanfx (make_fx)
- Dữ liệu công pháp & bốc thẻ
- Draft Lôi Cương: facing
- Quy tắc dự án & bàn giao
- GDD: tầm nhìn & art
- Giao diện (ui.js)
- beanfx kit: ảnh tham khảo
- ADR 0004 pixelfx
- Bản đồ & RNG
- Kiến trúc & save (thiết kế)
- ADR 0001 meta/run state
- ADR 0003 EXP, thẻ, tiến hóa
- Chiến đấu & trạng thái
- M2: quái & boss
- M5: hình ảnh & hiệu năng
- Xuất 2 lớp pixelfx
- Quy trình & nghiệm thu
- M3: tọa thiền & cảnh giới
- Draft Lôi Cương: hình nộm
- beanfx kit: hình nộm
- ADR 0005 beanfx chính
- M4: trang bị & gacha
- Báo cáo kiểm thử
- package.json
- Cấu hình gameplay
- beanfx kit: trang xem trước
- VFX Hỏa Long Quyển (pixelfx)
- ADR 0002 tự đánh
- Ảnh trước/sau Hỏa Long Quyển
- Server dev không cache
- Va chạm bản đồ
- Ảnh mẫu beanfx trong game
- pixelfx_truoc_sau.png (nhỏ)
- index.html (nhỏ)
- beanfx_loi_cuong_thu_nho.png (nhỏ)
- export.py (nhỏ)
- export.py (nhỏ)
- fxkit.py (nhỏ)
- sfx.py (nhỏ)
- sfx.py (nhỏ)
- sfx.py (nhỏ)

## God Nodes (most connected - your core abstractions)
1. `HANDOFF.md (handoff state)` - 32 edges
2. `_n()` - 22 edges
3. `updateHub()` - 20 edges
4. `GDD Tu Tien Lo v1.0` - 19 edges
5. `maxHp()` - 18 edges
6. `updateRun()` - 18 edges
7. `Rig` - 17 edges
8. `lowpass()` - 17 edges
9. `noise()` - 15 edges
10. `Execution backlog Tu Tien Lo` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ADR 0001 metaState/runState and save v2` --implements--> `Permanent meta vs temporary roguelite run`  [INFERRED]
  docs/adr/0001-state-va-save.md → CLAUDE.md
- `FEATURES.manualAttackInRun (Space/J)` --references--> `src/core/config.js gameplay params + FEATURES`  [INFERRED]
  docs/adr/0002-tan-cong-tu-dong.md → HANDOFF.md
- `Auto-cast skills on cooldown` --references--> `src/systems/combat.js skills`  [INFERRED]
  docs/adr/0002-tan-cong-tu-dong.md → HANDOFF.md
- `applyCard` --references--> `src/progression/draft.js card draft`  [INFERRED]
  docs/adr/0003-exp-the-tien-hoa.md → HANDOFF.md
- `pixelfx XP orb (dropped)` --references--> `Chien y XP orb`  [INFERRED]
  docs/adr/0004-pixelfx.md → HANDOFF.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Four vertical-slice evolution recipes** — gdd_tu_tien_lo_liet_diem_kiem_tran, gdd_tu_tien_lo_loi_dinh_van_kiem, gdd_tu_tien_lo_hoa_long_quyen, gdd_tu_tien_lo_loi_cuong_ho_the [EXTRACTED 1.00]
- **Meta cultivation loop: rewards -> meditation -> realm -> tribulation** — gdd_tu_tien_lo_run_rewards, gdd_tu_tien_lo_meditation_lingqi, gdd_tu_tien_lo_realm_18_tiers, gdd_tu_tien_lo_thien_kiep [INFERRED 0.85]
- **M1 run loop: state machine, combat, EXP, draft, skills, evolution** — tasks_tu_tien_lo_m1_01, tasks_tu_tien_lo_m1_02, tasks_tu_tien_lo_m1_03, tasks_tu_tien_lo_m1_04, tasks_tu_tien_lo_m1_05, tasks_tu_tien_lo_m1_06 [EXTRACTED 1.00]
- **Meta/run state separation and safe save** — claude_meta_run_separation, docs_adr_0001_state_va_save_metastate, docs_adr_0001_state_va_save_runstate, docs_adr_0001_state_va_save_localstorage_save_keys, handoff_src_persistence_save_js, claude_protect_tutien_save_v1 [INFERRED 0.85]
- **Four evolutions of the run** — handoff_loi_dinh_van_kiem, docs_adr_0003_exp_the_tien_hoa_liet_diem_kiem_tran, handoff_hoa_long_quyen, docs_adr_0003_exp_the_tien_hoa_loi_cuong_ho_the [EXTRACTED 1.00]
- **pixelfx-to-beanfx VFX pipeline** — tools_pixelfx_import, tools_pixelfx_layers, src_render_pixelfx, handoff_beanfx, handoff_pixelfx [INFERRED 0.85]
- **pixelfx vs code-drawn VFX trial on portal and battle orbs** — docs_pixelfx_truoc_sau_code_drawn_vfx, docs_pixelfx_truoc_sau_pixelfx, docs_pixelfx_truoc_sau_cong_bi_canh, docs_pixelfx_truoc_sau_vien_chien_y [EXTRACTED 1.00]

## Communities (69 total, 8 thin omitted)

### Community 0 - "Vòng lặp chính & điều khiển"
Cohesion: 0.07
Nodes (54): makeInput(), MOVE, afterMajor(), buyPill(), ctx, cv, ev, finishRun() (+46 more)

### Community 1 - "beanfx kit: hình khối (fxkit)"
Cohesion: 0.07
Nodes (28): at(), ball(), bayer(), blit(), claw_drops(), claw_marks(), debris_at(), drop() (+20 more)

### Community 2 - "Draft Lôi Cương: fxlib"
Cohesion: 0.06
Nodes (26): checker(), contract(), empty(), flash_rays(), grid(), ground_dist(), ground_ring(), heat() (+18 more)

### Community 3 - "beanfx kit: fxlib"
Cohesion: 0.06
Nodes (26): checker(), contract(), empty(), flash_rays(), grid(), ground_dist(), ground_ring(), heat() (+18 more)

### Community 4 - "beanfx kit: hướng (facing)"
Cohesion: 0.06
Nodes (11): check(), flip(), headings(), meta(), mirror(), offset(), part(), row_of() (+3 more)

### Community 5 - "beanfx kit: âm thanh tổng hợp"
Cohesion: 0.11
Nodes (24): boom(), charge(), _color(), crackle(), env(), fall(), highpass(), hit() (+16 more)

### Community 6 - "Draft Lôi Cương: derive"
Cohesion: 0.06
Nodes (20): chains(), _largest(), local(), outline(), part_lines(), _rank(), scatter(), simplify() (+12 more)

### Community 7 - "Vẽ khung & hiệu ứng (render)"
Cohesion: 0.09
Nodes (38): drawMap(), drawMonster(), drawPlayer(), drawPortal(), drawProjectiles(), drawSkillsOver(), drawSkillsUnder(), makeVis() (+30 more)

### Community 8 - "Draft Lôi Cương Hộ Thể"
Cohesion: 0.09
Nodes (19): age(), body_mask(), branches(), crawl_base(), draw(), jag(), light_rgb(), lit_path() (+11 more)

### Community 9 - "Draft Lôi Cương: fxkit"
Cohesion: 0.08
Nodes (19): at(), ball(), bayer(), blit(), claw_marks(), drop(), heat_bands(), hit_burst() (+11 more)

### Community 10 - "beanfx kit: sfx.py"
Cohesion: 0.10
Nodes (18): _bfx(), check(), crush(), fade(), find_sample(), from_sample(), guess_weight(), layers() (+10 more)

### Community 11 - "Game v0.1 (legacy)"
Cohesion: 0.13
Nodes (27): addBolt(), burst(), buyPill(), floatText(), frame(), fresh(), gainTuvi(), hud() (+19 more)

### Community 12 - "Draft Lôi Cương: caster"
Cohesion: 0.11
Nodes (22): aim_from(), body_light(), draw(), arm(), put(), ease_io(), ellipse_line(), finger_light() (+14 more)

### Community 13 - "beanfx kit: caster"
Cohesion: 0.11
Nodes (22): aim_from(), body_light(), draw(), arm(), put(), ease_io(), ellipse_line(), finger_light() (+14 more)

### Community 14 - "Draft Lôi Cương: pfx"
Cohesion: 0.13
Nodes (16): bands(), _cells(), composite(), contact(), _flat(), gain(), gif(), _hex() (+8 more)

### Community 15 - "beanfx kit: pfx"
Cohesion: 0.11
Nodes (17): bands(), _cells(), composite(), contact(), _flat(), gain(), gif(), _hex() (+9 more)

### Community 16 - "beanfx: va chạm & mảnh vỡ"
Cohesion: 0.11
Nodes (14): claw_drops(), claw_tracks(), debris_at(), facets(), fade(), ground_impact(), hit_cell(), hsh() (+6 more)

### Community 17 - "Draft Lôi Cương: export"
Cohesion: 0.11
Nodes (15): act(), _aseprite(), check(), check_act(), check_seeds(), _flat(), grid(), hit() (+7 more)

### Community 18 - "Yêu thú & vòng run"
Cohesion: 0.20
Nodes (23): RUN, makeMonster(), reapMonsters(), spawnHubMonster(), spawnRunMonster(), TIER_NAMES, tierOfLvl(), updateMonsters() (+15 more)

### Community 19 - "Cảnh giới & tu luyện"
Cohesion: 0.21
Nodes (22): tryBreak(), atk(), isMajor(), levelName(), MAX_L, maxHp(), need(), power() (+14 more)

### Community 20 - "beanfx kit: export"
Cohesion: 0.11
Nodes (15): act(), _aseprite(), check(), check_act(), check_seeds(), _flat(), grid(), hit() (+7 more)

### Community 21 - "Save v2 & cài đặt"
Cohesion: 0.19
Nodes (22): ADR-0001, REALM, applySettings(), openSettings(), commitMigration(), defaultMeta(), exportSave(), importSave() (+14 more)

### Community 22 - "beanfx kit: derive"
Cohesion: 0.10
Nodes (11): chains(), _largest(), local(), outline(), part_lines(), _rank(), scatter(), simplify() (+3 more)

### Community 23 - "beanfx kit: ánh sáng"
Cohesion: 0.10
Nodes (11): bands(), buffer(), _flash(), flash_at(), Flashes, flicker(), glow(), glow_line() (+3 more)

### Community 24 - "Draft Lôi Cương: ánh sáng"
Cohesion: 0.10
Nodes (11): bands(), buffer(), _flash(), flash_at(), Flashes, flicker(), glow(), glow_line() (+3 more)

### Community 25 - "GDD: công pháp & thẻ"
Cohesion: 0.15
Nodes (21): Auto / hybrid combat with Space/J manual compatibility, Ho The Cuong Khi (body_aura), Card draft: pick 1 of 3 with level-up queue, Card types NEW_SKILL / UPGRADE_SKILL / PASSIVE / EVOLUTION, Hoa Cau (fire_orb), Hoa Long Quyen (Hoa + Phong), Liet Diem Kiem Tran (Kiem Khi + Hoa), Loi Cuong Ho The (Loi + Ho The) (+13 more)

### Community 26 - "Nhập sheet pixelfx"
Cohesion: 0.13
Nodes (8): main(), unpremultiply(), xp_orb_head(), _cells(), load(), measure(), over(), project_root()

### Community 27 - "Trình phát beanfx.js"
Cohesion: 0.14
Nodes (11): createFx(), fx, fromJson(), loadFx(), loadImage(), rowOf(), hubShoot(), loadImage() (+3 more)

### Community 28 - "5 VFX beanfx (make_fx)"
Cohesion: 0.17
Nodes (13): _along(), blank(), _bolt(), build(), dot(), dot_pha(), ease_in(), ease_out() (+5 more)

### Community 29 - "Dữ liệu công pháp & bốc thẻ"
Cohesion: 0.20
Nodes (18): ELEMENTS, EVOLUTIONS, FALLBACK_CARD, PASSIVES, SKILLS, moveEntity(), applyCard(), candidates() (+10 more)

### Community 30 - "Draft Lôi Cương: facing"
Cohesion: 0.11
Nodes (9): check(), flip(), headings(), meta(), mirror(), part(), row_of(), rows() (+1 more)

### Community 31 - "Quy tắc dự án & bàn giao"
Cohesion: 0.14
Nodes (13): CLAUDE.md project instructions, GDD_TU_TIEN_LO.md, TASKS_TU_TIEN_LO.md, Chien y XP orb, HANDOFF.md (handoff state), Dong phu (hub) map, Gate M1 (not fully met), Loi kiep tribulation (70% RNG) (+5 more)

### Community 32 - "GDD: tầm nhìn & art"
Cohesion: 0.18
Nodes (14): beanfx VFX library (kiem_khi, kiem_trung, loi_kiep, dot_pha, toa_thien), Current prototype state to preserve, Skill evolution / synergy recipes, GDD Tu Tien Lo v1.0, HANDOFF.md (source of truth for current code), High concept: browser 2D pixel survival roguelite + tu tien RPG, Legacy formulas need(L)=round(60*1.38^L), power(L) baseline, Legacy tribulation MAJOR_CHANCE 70% / 2.6s (+6 more)

### Community 33 - "Giao diện (ui.js)"
Cohesion: 0.20
Nodes (12): elementName(), skillElement(), skillName(), closeModal(), esc(), fmtTime(), runHud(), showDraft() (+4 more)

### Community 34 - "beanfx kit: ảnh tham khảo"
Cohesion: 0.16
Nodes (9): _conv3(), edge_map(), gradient(), levels(), load(), luminance(), mask_of(), paint() (+1 more)

### Community 35 - "ADR 0004 pixelfx"
Cohesion: 0.20
Nodes (14): Alpha un-premultiply on import, ADR 0004 pixelfx as secondary VFX library, pixelfx XP orb (dropped), loc_gio_v2 draft (candidate for Hoa Long Quyen), pixelfx NOTICE, Hollow Crown (rehan-remade, MIT), Hugo Duprez / Sprite Fusion VFX (MIT), Patch Pixel font (+6 more)

### Community 36 - "Bản đồ & RNG"
Cohesion: 0.21
Nodes (13): HUB, TILE, hash(), mulberry32(), noise(), GRASS, makeArenaMap(), makeHubMap() (+5 more)

### Community 37 - "Kiến trúc & save (thiết kế)"
Cohesion: 0.23
Nodes (13): Data-driven defs SkillDef, UpgradeDef, EvolutionRecipe, EnemyDef, ItemDef, LootTable, Incremental module architecture (src/core, world, entities, ...), Save v2 schema + migration with backup, localStorage key tutien_save_v1, metaState / runState / viewState separation, ADR decisions to record (section D), Gate M0 (PASSED, baseline commit 0032429), M0 Bao toan prototype & chat luong nen (P0) (+5 more)

### Community 38 - "ADR 0001 meta/run state"
Cohesion: 0.21
Nodes (9): ADR 0001 metaState/runState and save v2, localStorage keys v1/v1_backup/v2/v2_bak/v2_corrupt, REWARD_PENDING -> REWARDED single commit, sanitizeMeta, viewState HUB/PREPARE/RUN/CARD_DRAFT/RESULTS/SETTINGS, src/main.js loop and view states, src/persistence/save.js save v2, src/systems/run.js run session (+1 more)

### Community 39 - "ADR 0003 EXP, thẻ, tiến hóa"
Cohesion: 0.21
Nodes (11): addRunXp / pendingDrafts, applyCard, ADR 0003 run EXP, card draft, evolution, Draft weights (upgrade 2.0, new 1.0, passive 0.7, evo 100), Hoi Linh fallback card, Liet Diem Kiem Tran, xpToNext formula, src/data/skills.js skill data (+3 more)

### Community 40 - "Chiến đấu & trạng thái"
Cohesion: 0.33
Nodes (11): applyBurn(), applySlow(), damageMonster(), addZone(), chainLightning(), explode(), hitMonster(), KINDS (+3 more)

### Community 41 - "M2: quái & boss"
Cohesion: 0.25
Nodes (11): Mini-boss + final boss with telegraphed patterns, Enemy archetypes chaser/charger/ranged/area_denier/elite/boss, 4 legacy monsters (Da Lang, Hoa Ho, Huyen Bang Thu, Ma Anh), Gate M1 (not yet passed), M2 Complete run vertical slice (P1), M2-01 Time director and waves, M2-02 Mini-boss, final boss, telegraph, M2-03 Run results + one-time reward commit (+3 more)

### Community 42 - "M5: hình ảnh & hiệu năng"
Cohesion: 0.27
Nodes (9): Performance targets 60 FPS desktop, stress 100/200/300, UX/UI minimum, input and accessibility, M5 Visual pseudo-2.5D, audio, performance (P2), M5-01 Art direction prototype one zone, M5-02 Character/enemy sprite pipeline, M5-03 Elemental VFX + telegraph & accessibility, M5-04 Profiling + stress test + graphics settings, M5-05 SFX/music and settings (+1 more)

### Community 43 - "Xuất 2 lớp pixelfx"
Cohesion: 0.18
Nodes (8): color, cols, json, light, out, r, [repo, id, name, outArg], rows

### Community 44 - "Quy trình & nghiệm thu"
Cohesion: 0.22
Nodes (7): Future online/multiplayer/monetization (not self-implemented), Mandatory functional tests, Execution backlog Tu Tien Lo, Implementation log (section E), M6 Later / not allowed to self-implement (P3), Session report format (section B), Claude Code start prompt (section F)

### Community 45 - "M3: tọa thiền & cảnh giới"
Cohesion: 0.29
Nodes (10): Hub meditation converting lingQi to cultivationXp, In-run rest / meditation point, Tu Khi Dan pill, Tu Linh Tran (spirit-gathering array), Gate v0.2, M3 Meta tu tien: meditation, realm, tribulation (P2), M3-01 lingQi to cultivationXp via meditation, M3-02 Realm thresholds and unlocks (+2 more)

### Community 46 - "Draft Lôi Cương: hình nộm"
Cohesion: 0.27
Nodes (5): draw(), paint(), _hex(), reaction(), under()

### Community 47 - "beanfx kit: hình nộm"
Cohesion: 0.27
Nodes (5): draw(), paint(), _hex(), reaction(), under()

### Community 48 - "ADR 0005 beanfx chính"
Cohesion: 0.28
Nodes (6): Loi Cuong Ho The, beanfx rig.py / casters rig.json, ADR 0005 beanfx primary, pixelfx secondary, beanfx VFX library, vfx/drafts README (beanfx drafts), loi_cuong_ho_the draft (aura_thunder_v3, K=0.36)

### Community 49 - "M4: trang bị & gacha"
Cohesion: 0.31
Nodes (8): Equipment slots + luyen khi crafting, Run rewards with idempotent awardCommitted, Truyen Thua Cac gacha (earned tickets only), v0.4 Collection & Visual Polish, M4 Equipment, collection, gacha (P2), M4-01 Minimal equipment + luyen khi, M4-02 Unlock cong phap via achievements, M4-03 Truyen Thua Cac gacha with game tickets

### Community 50 - "Báo cáo kiểm thử"
Cohesion: 0.25
Nodes (8): baseline-v0.1 rollback tag, Loi Dinh Van Kiem evolution, src/core/input.js keyboard, npm test automated suite, B3 fast keypress ignored bug (fixed M0-05), FPS measurement 16.7 ms, M11 Loi Dinh Van Kiem evolution hand-played PASS, R10 Esc ignored when checkbox focused (fixed)

### Community 51 - "package.json"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, start, test, type, version

### Community 52 - "Cấu hình gameplay"
Cohesion: 0.25
Nodes (7): BASIC_ATTACK, FEATURES, HUB_MONSTER, ITEMS, MEDITATION, PLAYER, VIEW

### Community 53 - "beanfx kit: trang xem trước"
Cohesion: 0.29
Nodes (3): page(), skill_dir(), _skill_page()

### Community 54 - "VFX Hỏa Long Quyển (pixelfx)"
Cohesion: 0.33
Nodes (4): draw(), meta, NL, SMOKE1

### Community 55 - "ADR 0002 tự đánh"
Cohesion: 0.33
Nodes (5): ADR 0002 auto attack in run, Line-of-sight targeting (trees/rocks block), FEATURES.manualAttackInRun (Space/J), FEATURES.pixelfxAssets flag, src/core/config.js gameplay params + FEATURES

### Community 56 - "Ảnh trước/sau Hỏa Long Quyển"
Cohesion: 0.40
Nodes (5): Code-drawn particle ring VFX (before), Hoa Long Quyen 6-frame sprite strip (3x on grass), Hoa Long Quyen (fire dragon tornado VFX), VFX Hoa Long Quyen before/after comparison, 2D pixel top-down arena (stone tiles, player, slime)

### Community 59 - "Ảnh mẫu beanfx trong game"
Cohesion: 0.50
Nodes (5): beanfx VFX tool, beanfx in-game sample frames (screenshot grid), Loi aura VFX (lightning ground ring, frames 10 and 22), Phat No Hoa Lien skill VFX (charge frame 40, explosion frame 90), Pixel top-down player sprite

### Community 60 - "pixelfx_truoc_sau.png (nhỏ)"
Cohesion: 0.90
Nodes (4): pixelfx Before/After Comparison (Truoc/Sau), Cong bi canh (Secret Realm Portal) VFX, pixelfx VFX tool (Sau), Vien chien y (Battle Intent Orbs) VFX

### Community 61 - "index.html (nhỏ)"
Cohesion: 0.40
Nodes (5): Bi canh roguelite run, index.html game page, Hub HUD panel (realm, HP, tu vi), Modal sheet (cards, results, settings), Run HUD (combat level, XP, timer, skills)

### Community 62 - "beanfx_loi_cuong_thu_nho.png (nhỏ)"
Cohesion: 0.50
Nodes (4): beanfx Loi Cuong thumbnail strip (6 VFX frames), beanfx VFX tool, Glowing ground ring under player, Loi Cuong (lightning empower) VFX

## Knowledge Gaps
- **33 isolated node(s):** `ADR-0001`, `Card types NEW_SKILL / UPGRADE_SKILL / PASSIVE / EVOLUTION`, `Legacy formulas need(L)=round(60*1.38^L), power(L) baseline`, `Tu Linh Tran (spirit-gathering array)`, `Tu Khi Dan pill` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 468 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HANDOFF.md (handoff state)` connect `Quy tắc dự án & bàn giao` to `ADR 0004 pixelfx`, `ADR 0001 meta/run state`, `ADR 0003 EXP, thẻ, tiến hóa`, `Game v0.1 (legacy)`, `Xuất 2 lớp pixelfx`, `ADR 0005 beanfx chính`, `Báo cáo kiểm thử`, `Cảnh giới & tu luyện`, `ADR 0002 tự đánh`, `Nhập sheet pixelfx`, `Trình phát beanfx.js`, `index.html (nhỏ)`?**
  _High betweenness centrality (0.395) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `updateHub()` (e.g. with `killHubMonster()` and `meta()`) actually correct?**
  _`updateHub()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ADR-0001`, `Card types NEW_SKILL / UPGRADE_SKILL / PASSIVE / EVOLUTION`, `Legacy formulas need(L)=round(60*1.38^L), power(L) baseline` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vòng lặp chính & điều khiển` be split into smaller, more focused modules?**
  _Cohesion score 0.07103825136612021 - nodes in this community are weakly interconnected._
- **Why does `ADR 0003 run EXP, card draft, evolution` connect `ADR 0003 EXP, thẻ, tiến hóa` to `ADR 0005 beanfx chính`, `ADR 0002 tự đánh`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `beanfx kit: hình khối (fxkit)` be split into smaller, more focused modules?**
  _Cohesion score 0.06894049346879536 - nodes in this community are weakly interconnected._
- **Why does `src/main.js loop and view states` connect `ADR 0001 meta/run state` to `index.html (nhỏ)`, `Quy tắc dự án & bàn giao`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._