# Vũ trụ tình yêu

Website kỷ niệm với intro 3D dài 28 giây: khởi động, hyperdrive qua ảnh ký ức, tiếp cận trái tim và chuyển sáng sang giao diện chính.

## Chạy local

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python 200.py
```

Mở http://127.0.0.1:5001/. Chạy qua HTTP để ảnh WebGL tải đúng; trình duyệt có thể chặn texture khi mở trực tiếp file HTML. Three.js và font được tải từ CDN. Khi Three.js không khả dụng, các nút vào trang vẫn hoạt động và intro tự bỏ qua sau 30 giây.

Thêm ảnh vào `static/love_images/`: Flask tự cập nhật danh sách. Chạy `python image_catalog.py` để cập nhật `static/memories.js` nếu dùng máy chủ static.

## Kiểm tra trình duyệt

Cần Node.js, package `playwright` và Google Chrome. Nếu Playwright được cài ở vị trí khác, đặt `NODE_PATH` tới thư mục chứa package.

```sh
node tests/browser_smoke.cjs
node tests/intro_cinematic.cjs
```

Smoke test kiểm tra desktop/mobile khi CDN bị chặn: bỏ qua intro, thư viện ảnh, hộp thư, nhạc và ẩn/hiện giao diện. Cinematic test kiểm tra đủ ba hồi, chuyển sang cảnh chính, giải phóng canvas intro và chế độ giảm chuyển động. Ảnh kiểm thử lưu trong `output/playwright/`. Có thể đặt `LOVE_TEST_URL` để kiểm tra một địa chỉ khác.

## Nhạc intro

“Cùng một quỹ đạo” là bản instrumental tổng hợp riêng dài 28 giây: piano mềm và pad mở đầu, arpeggio cùng nhịp bass ở hyperdrive, hợp âm sáng tại mốc 26,8 giây. Không dùng sample hay bản thu của bên thứ ba. File MP3 được phục vụ cùng website, không phụ thuộc dịch vụ nhạc ngoài.

Trình duyệt cho phép thì nhạc tự phát ở âm lượng 55%; nếu bị chặn, chọn **Bật nhạc intro ♫**. Bật muộn vẫn khớp vị trí cảnh bay. Có thể tắt nhạc, và nhạc tự giảm âm khi bỏ qua/kết thúc intro. Bài nhạc của giao diện chính vẫn bật riêng bằng nút PLAY MUSIC.

Để dựng lại file nhạc: cài NumPy và FFmpeg, rồi chạy `python scripts/render_intro_score.py`. Chạy `node tests/intro_audio.cjs` để kiểm tra bật/tắt, đồng bộ, kết thúc và lỗi tải nhạc.
