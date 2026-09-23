# Vũ trụ tình yêu

Website kỷ niệm với intro 3D dài 28 giây: khởi động, hyperdrive qua ảnh ký ức, tiếp cận trái tim và chuyển sáng sang giao diện chính.

## Chạy local

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python 200.py
```

Mở http://127.0.0.1:5001/. Chạy qua HTTP để ảnh WebGL tải đúng; trình duyệt có thể chặn texture khi mở trực tiếp file HTML. Three.js được phục vụ tại chỗ, font có thể tải từ CDN. Khi Three.js không khả dụng, các nút vào trang vẫn hoạt động và intro tự bỏ qua sau 30 giây.

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

## Vũ trụ 2.0

Giao diện chính có ba hành tinh ảnh, camera bay đến từng album, chòm sao trái tim/QA & YN/Cự Giải/Song Tử, sao băng có thể bắt, form điều ước, cổng thư tương lai và hiệu ứng theo bass/treble. Nút **Hiệu ứng nhẹ** giảm tải; `prefers-reduced-motion` được áp dụng cho cả cảnh và tương tác.

Cài và chạy:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/build_thumbnails.py
python 200.py
```

Mở `http://127.0.0.1:5001/`. Three.js r128 được phục vụ từ `static/vendor/` (giấy phép MIT đi kèm); không cần CDN để chạy cảnh. Fonts vẫn có font hệ thống dự phòng. `static/love_song.web.mp3` là bản 128 kbps phục vụ trên web; bản gốc còn nguyên. `static/thumbnails/` chứa ảnh xem trước; ảnh lớn tải bản gốc khi mở.

### Chỉnh album và chòm sao

Chỉnh `content/universe.json`. Ba nhóm mặc định là toàn bộ ảnh, file Locket và file Messenger; chưa gán các ngày/cột mốc cá nhân chưa được xác nhận. Mỗi hành tinh có `id`, `title`, `description`, `color`, `style` (`rose`, `crystal`, `ring`) và `memoryIds`. `allMemories: true` tự bao gồm ảnh mới. Hành tinh không có ảnh sẽ không hiện. Muốn tạo cột mốc riêng, đặt `allMemories: false` và điền các ID ảnh đã chọn.

ID được sinh ổn định từ tên file, xem trong `GET /api/universe` hoặc `static/memories.js`. Trong `memories`, thêm các bản ghi `{ "id": "m-...", "caption": "...", "alt": "...", "date": "2026-01-01" }` để ghi lời kể thật. Không đặt thư tương lai/đáp án hoặc token tại đây.

Mỗi mẫu chòm sao gồm `points` (tọa độ 0–1), `edges` (cặp chỉ số điểm bắt đầu từ 0), `message` và `version`. Tăng `version` nếu đổi hình để tiến độ cũ không áp sang hình mới. Có thể tắt từng phần bằng `features`.

Sau khi thêm ảnh hoặc thay metadata, chạy:

```sh
python scripts/build_thumbnails.py
```

Flask đọc metadata mới ở lần tải trang tiếp theo; lệnh trên cũng cập nhật snapshot dùng khi mở HTML trực tiếp. Chế độ `file://` xem được album/chòm sao nhưng không gửi điều ước hoặc mở thư qua API.

### Thư tương lai riêng tư

Chưa có thư cá nhân/ngày mở nên giao diện hiện trạng thái đang chuẩn bị. Để thiết lập, viết thư UTF-8 vào một file riêng ngoài `static/`, rồi chạy:

```sh
python scripts/configure_capsule.py
```

Script hỏi tên thư, câu hỏi, giờ mở có timezone (ví dụ `2028-04-21T00:00:00+07:00`), đáp án nhập ẩn và đường dẫn file thư. Kết quả lưu tại `instance/capsule.json`, không vào git. Đáp án được chuẩn hóa Unicode, chữ hoa/thường và khoảng trắng; dấu tiếng Việt vẫn có ý nghĩa. Nội dung chỉ được API trả khi đáp án đúng và đồng hồ server đã đến ngày mở.

Mốc gốc hiện là `2025-07-26T00:00:00+07:00`. Đủ 1.000 ngày là 21/04/2028; nếu tính ngày bắt đầu là ngày số 1, ngày thứ 1.000 là 20/04/2028. Chủ nhân chọn mốc khi cấu hình, không có mốc tự đặt trong capsule.

### Điều ước và kênh nhận (cấu hình sau)

Điều ước được ghi trước vào `instance/universe.sqlite3` cùng tác vụ gửi. Nếu chưa cấu hình kênh/worker, trạng thái vẫn là **đã lưu, chờ gửi**. Không cần cấu hình bot để dùng phần lưu điều ước.

Xem `.env.example` để biết tên biến môi trường. App **không tự nạp file `.env`**; thiết lập biến trong shell hoặc trình quản lý dịch vụ. Không commit token. Chọn một kênh:

- Telegram: `WISH_PROVIDER=telegram`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. Người nhận cần bắt đầu trò chuyện với bot trước.
- Email: `WISH_PROVIDER=email`, `SMTP_HOST`, `SMTP_PORT` (mặc định 587), `SMTP_FROM`, `WISH_EMAIL_TO`; thêm `SMTP_USERNAME` và `SMTP_PASSWORD` nếu server yêu cầu. Kết nối bắt buộc STARTTLS.

Sau khi cấu hình, chạy worker riêng với cùng môi trường và cùng đường dẫn dữ liệu:

```sh
python scripts/deliver_wishes.py
```

Worker dùng lease 120 giây, timeout gửi 15 giây, tối đa 8 lần thử, giãn cách tăng dần tối đa một giờ. Chạy một lượt bằng `--once`; sau khi sửa cấu hình hoặc lỗi dịch vụ, có thể đưa các tác vụ thất bại về hàng chờ bằng `--retry-failed`. Lệnh này thực sự gửi thông báo tới người nhận đã cấu hình.

Một request gửi lại cùng khóa chỉ tạo một bản ghi. Nếu nhà cung cấp đã nhận rồi timeout, retry có thể gửi lặp thông báo; mỗi thông báo có mã điều ước để nhận diện. Phiên trình duyệt khác không được xem trạng thái điều ước của phiên trước.

### Chạy production và dữ liệu

```sh
gunicorn --bind 127.0.0.1:8000 --workers 2 '200:app'
```

Dùng reverse proxy HTTPS và đặt `LOVE_HTTPS=1`. Nếu có đúng một reverse proxy đáng tin cậy kết thúc TLS, đặt `LOVE_TRUSTED_PROXY_HOPS=1`, chuyển tiếp Host gốc và giữ Gunicorn chỉ nghe trên localhost. Mặc định là 0 để không tin các header forwarded từ client; số hop phải khớp hạ tầng thực tế. App kiểm tra origin + CSRF cho POST. Không bật `FLASK_DEBUG` ở production.

`LOVE_INSTANCE_PATH` phải trỏ đến thư mục bền vững dùng chung bởi web và worker trên cùng máy. Nếu không đặt `LOVE_SECRET_KEY`, một khóa phiên ngẫu nhiên được tạo và lưu trong DB để các worker dùng cùng khóa. Thiết lập quyền đọc thư mục riêng cho tài khoản chạy dịch vụ. Đây không phải thiết kế cho nhiều host chia sẻ file SQLite.

Backup DB bằng SQLite backup API (phù hợp cả khi WAL đang hoạt động), cùng file capsule riêng. Ví dụ, sau khi thay đường dẫn cho môi trường thực tế:

```sh
python -c "import sqlite3; a=sqlite3.connect('instance/universe.sqlite3'); b=sqlite3.connect('/safe/backup/universe.sqlite3'); a.backup(b); b.close(); a.close()"
```

Khi khôi phục, dừng web/worker, phục hồi DB và file capsule rồi khởi động lại với cùng cấu hình. Rollback giao diện không xóa DB điều ước. Theo dõi worker bằng service manager; không khởi chạy worker bên trong request Gunicorn.

### Kiểm thử 2.0

```sh
python -m unittest discover -s tests -p 'test_*.py' -v
node tests/browser_smoke.cjs
node tests/intro_cinematic.cjs
node tests/intro_audio.cjs
node tests/universe_v2.cjs
node tests/heart_focus.cjs
node tests/energy_vortex.cjs
node tests/universe_resilience.cjs
```

Các script browser cần package `playwright`, Node.js và Chrome như phần kiểm thử bên trên. Đặt `LOVE_TEST_URL` nếu server không ở cổng 5001. Backend tests dùng DB tạm và sender giả; browser tests điều ước/capsule dùng route giả, không gửi thông báo thật. Kiểm thử mới bao phủ quyền đọc thư, mốc thời gian, idempotency, lease/retry, bốn chòm sao, cảm ứng, ảnh lớn, bộ nhớ GPU và bắt sao băng.

Xem `docs/IMPLEMENTATION_V2.md` cho phạm vi đã triển khai, nội dung còn cần điền và giới hạn vận hành.
