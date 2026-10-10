# STYLE_BIBLE — Seismic: 9 Vùng Đất

Bản áp dụng **luật asset PixelLab** (`C:/Users/tranh/Downloads/CLAUDE.md`, nhận 2026-10-10) cho dự án này, đã chỉnh theo các quyết định anh Hùng chốt cùng ngày. Chỗ nào khác luật gốc thì theo file này.

## Khối STYLE LOCK
Nằm ở `tools/pxlab.py` (`STYLE_LOCK`). `post()` tự chèn vào đầu `description` của mọi lệnh `/create-*`. Muốn tắt cho một lần chạy thì đặt `PX_NO_LOCK=1`. Lệnh animate không bị chèn.
```
[STYLE LOCK] cozy farming-sim pixel art, top-down view with front faces visible, 16px logical grid,
chunky readable shapes, 1px dark brown outline (never pure black), soft warm palette,
light from top-left, 2-3 shades per material, no anti-aliasing, no gradients, no glow.
```
Tham số API theo style (a) trong `tools/px-styles.json`: `outline: single color outline` (trường này là **enum**, không ghi chữ tự do), `shading: basic shading`, `detail: medium detail`.

## Chỗ khác luật gốc (anh chốt 2026-10-10)
| Luật gốc | Dự án này | Lý do |
|---|---|---|
| Tile file 16×16 | Ảnh **2×**: 1 ô logic 16 px = file 32 px. "Bội số 16" tính theo **logic** | PixelLab sinh ở 16 px xấu (plan-6). Shim `drawImage` trong art.js lo việc nhân đôi |
| Mẫu "map object" cho mọi vật | **Vật tĩnh** (nhà, tường, rào, quầy, bảng, giếng, đình, bệ tượng, cổng…) sinh bằng `create-8-direction-object` view `high top-down`, lấy hướng **nam** (`tools/px-td8.py`). Chỉ vật **chuyển động** mới vẽ xéo 3/4 | Cùng camera với đoạn tường. `view: side` bị chê suông |
| Nhân vật ~16×32 | **16×20 logic** (file ô 32×40), người cao 20 px ≈ 1,7 m, 1 m ≈ 12 px | Đã khớp tỷ lệ nhà 64, cây 48, thú (bảng `tools/px-scale.py`) |
| 8 FPS mọi thứ | 8 FPS cho đi, đứng, thú, vật lặp, cờ. **12 FPS** cho động tác nhanh (chop, mine, hammer, reel) và VFX | Chặt cây chậm quá thì mất cảm giác. Hằng số ở `src/anim.js` |
| Ép palette 32–48 màu | **Không ép kho cũ.** `assets/palette.hex` (47 màu rút từ asset đã duyệt + viền `#352022`) chỉ làm chuẩn tham chiếu cho asset **mới** | Ép kho cũ làm xấu thứ anh đã duyệt |
| Thư mục `characters/ tilesets/ objects/ crops/ vfx/` | **Giữ cấu trúc cũ**, xem bảng đối chiếu dưới | Tránh sửa art.js, 12 gói vùng, deploy |
| Viền màu tối có sắc độ | Viền **nâu đậm `#352022`**. Kho cũ đã đổi bằng `tools/px-outline.py` | Anh chốt |

## Bảng đối chiếu thư mục
| Luật | Dự án |
|---|---|
| `characters/{tên}/…` | `assets/px/chars/<tên>.png` (sheet 96×160) + `chars/<tên>/` (khung gốc, `meta.json` có `character_id`); NPC theo vùng ở `zones/<vùng>/chars/` |
| `characters/{tên}/{tên}_{anim}_{hướng}.png` | clip động tác `chars/<thân>_<anim>.png`, mỗi hàng là 1 hướng (thứ tự s, w, e, n). Khai báo trong manifest `chars.actions` |
| `tilesets/{lower}_to_{upper}/` | `assets/px/wang/<bộ>/` + `tiles/` |
| `objects/{loại}/…` | `zones/<vùng>/obj/`, `gen_td/`, `obj/` |
| `crops/{tên}/{tên}_stage{0-4}` | `zones/village/farm/crop_<cây>_<0..3>.png` + `_dead` (hiện 4 bậc: mầm → chín; bậc hạt sẽ thêm ở plan-19) |
| `vfx/{tên}_{N}f_{WxH}.png` | `assets/px/vfx/<tên>_<N>f_<W>x<H>.png` (mới, theo đúng luật) |
| `ui/` | `assets/px/ui/` |

## Manifest
- `assets/px/manifest.json` cùng 12 gói `zones/<vùng>.json` là **manifest chạy game**, art.js đọc. Clip và VFX có thể ghi thêm `fps`, `impact`, `pivot`.
- `assets/px/registry.json` là **sổ asset** theo luật mục 6: `id` PixelLab, `prompt`, `size` (file và logic), `frames`, `fps`, `pivot`, `impact`, `date`, `status` (`draft`/`approved`), `qa`. Sinh bằng `python tools/px-meta.py build`, ghi kiểu **merge**: trường đã sửa tay được giữ.
- Mọi tool ghi manifest phải merge (`{**cũ, **mới}`), không gán đè cả nhánh. Chạy xong thì kiểm lại các khoá `ui`.

## Animation (luật mục 3, phạm vi đã chốt)
- Người chơi (`hung_b`, `c0`): walk, chop, mine, fish/cast/reel, hammer, paddle, carry (đã có). Còn thiếu idle, hoe, water, harvest, eat, hurt (plan-19 B1/B2).
- NPC: chỉ walk. Anh bỏ idle NPC.
- Mọi animation sinh bằng `animate_character` trên đúng `character_id` gốc. Không tạo lại nhân vật.

## VFX
Sheet riêng, nền trong suốt, pivot dưới giữa, 16×16 hoặc 32×32 logic. Mỗi VFX gắn với 1 animation phải ghi `impact` (chỉ số khung va chạm) trong manifest. Không glow mờ: chỉ dùng 1–2 màu sáng cộng viền.

## QA trước khi lắp
Bội 16 logic · không có `#000000` · viền nâu · nền trong suốt (trừ tile đất) · đủ 4 hướng · chiều cao người lệch ≤ 1 px logic · VFX đúng impact frame và pivot · manifest/registry đã cập nhật · chạy game 12 vùng không lỗi.
Asset mới làm theo thứ tự: 1 bản chuẩn → anh duyệt (`approved`) → mới làm hàng loạt.
