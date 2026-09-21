# Vũ trụ tình yêu 2.0 — Trạng thái triển khai

Ngày: 21/09/2026. Bản này triển khai trên Flask + JavaScript + Three.js hiện có.

## Đã có

- Một cảnh chính với trái tim, nebula và ba hành tinh, camera focus/quay về, ảnh xem trước và album đầy đủ. Một vòng lặp quản lý hiệu ứng, camera, sao băng và tín hiệu âm thanh.
- Ba mẫu chòm sao: trái tim, QA & YN và **Cự Giải** theo xác nhận của Quang Anh. Chuột, kéo/chạm và bàn phím; nhiều nét, lùi nét, vẽ lại, lưu tiến độ theo phiên bản.
- Sao băng có vùng bắt 56 px, chuyển động cùng dữ liệu hit target; bắt được dừng cảnh một giây rồi mở form. Có đường gửi điều ước trực tiếp cho người dùng giảm chuyển động.
- SQLite lưu điều ước và outbox trong cùng giao dịch; chống trùng theo phiên + khóa request. Worker riêng với lease và retry; adapter Telegram hoặc SMTP STARTTLS. Không chạy worker gửi thật trong lần triển khai này.
- Thư tương lai kiểm tra đáp án hash và thời điểm tại server. Metadata không kèm thư, mỗi lần đọc kiểm tra lại quyền phiên và giờ mở; giới hạn thử được lưu trong DB. Có script tạo cấu hình riêng bằng nhập đáp án ẩn.
- Tách dải bass/mid/treble bằng FFT 2.048, ngưỡng beat thích ứng, làm mượt tín hiệu, ảnh hưởng sao/trái tim/mây. Bật nhạc theo thao tác người dùng, file preview có fallback HTML audio.
- Giữ intro 28 giây và nhạc intro; phục vụ Three.js r128 tại chỗ, kèm giấy phép MIT. Intro và album dùng thumbnail; ảnh lớn vẫn là bản gốc.
- 50 thumbnail tổng 1,94 MiB so với 42,29 MiB ảnh gốc. Bản nhạc web khoảng 12 MB (128 kbps), bản gốc vẫn giữ nguyên.
- Chế độ nhẹ, giảm chuyển động, tạm ngừng cảnh khi tab ẩn, điều hướng bàn phím và focus trap modal, fallback DOM khi không có WebGL.
- Cảnh chính đã cập nhật chuyển động tương tác: trái tim lớn hơn theo profile desktop/mobile; hành tinh và halo lớn hơn; hover mesh/nhãn dùng `hoveredPlanetId`, spring scale/glow/lift/opacity và camera parallax. Quỹ đạo tiếp tục chuyển động khi hover thay vì đóng băng.

## Nội dung còn cần chủ nhân chuẩn bị

Quang Anh đã chọn **cấu hình kênh gửi sau**. Khi chưa cấu hình, điều ước được lưu ở trạng thái chờ; không báo là đã gửi đến anh. Chỉ khởi động worker sau khi đã thiết lập kênh nhận.

Chưa có ngày mở thư, câu hỏi/đáp án và thư cá nhân nên capsule hiện lời nhắn “Anh đang chuẩn bị lá thư này”. Engine khóa thời gian đã có và được kiểm thử bằng dữ liệu thử riêng; không điền một đáp án hoặc ngày mở giả vào production.

Album mặc định gồm tất cả ảnh, nhóm file Locket và nhóm file Messenger. Đây là phân nhóm từ tên file có sẵn, không phải suy đoán ngày hẹn/giận hờn. Chỉnh `content/universe.json` để đổi thành các cột mốc thật và thêm chú thích/ngày.

## Cấu trúc

- `server/`: factory Flask, capsule, SQLite, outbox/delivery.
- `static/universe/`: core/API/modal, camera, scene, audio, planets/gallery, constellations, meteors, wishes, capsule.
- `content/universe.json`: nội dung công khai, cờ tính năng, mẫu chòm sao.
- `instance/`: dữ liệu riêng không vào git; cần volume bền vững khi deploy.
- `scripts/build_thumbnails.py`, `configure_capsule.py`, `deliver_wishes.py`: công cụ vận hành.

## Giới hạn thực tế

- Tiến độ chòm sao lưu trên trình duyệt, chưa đồng bộ nhiều máy.
- Không bảo vệ toàn bộ website bằng đăng nhập. Câu hỏi kỷ niệm chỉ bảo vệ thư tương lai và có thể dễ đoán nếu nội dung câu hỏi phổ biến.
- Nhà cung cấp có thể đã nhận thông báo trước khi timeout; retry có thể gửi trùng thông báo dù chỉ có một điều ước trong DB. Mã điều ước giúp nhận diện.
- SQLite/outbox thiết kế cho một host với volume bền vững. Chạy nhiều host cần chuyển sang DB chung trước.
- Việc kiểm tra trên viewport cảm ứng/giảm chuyển động không thay thế đo GPU, âm thanh và thao tác trên iPhone/Android thật.
- Chưa xuất bản lên host công khai vì chưa có đích triển khai hoặc cấu hình kênh/thư riêng. Bản local dùng cùng ứng dụng cần triển khai, không phải mockup.

## Cập nhật visual interaction

- Heart base scale: `1.38` desktop, `1.18` mobile; pulse âm thanh được nhân sau scale nền.
- Planet mesh radius: `32`; atmosphere sprite: `132`; ring geometry: `42–59`.
- Hover target: scale `1.28`, lift `10`, emissive `0.28`; selected target: scale `1.20`, lift `12`, emissive `0.34`. Transition dùng damping theo `deltaTime`, không dùng timeout CSS cho trạng thái 3D.
- Raycast pointermove trên canvas và pointerenter/focus trên nhãn đều cập nhật một ID chung. `elapsed` luôn chạy trong `EXPLORE`, kể cả khi hover.
- Các giá trị trên là target tuning đã triển khai, cần xác nhận thêm trên iPhone/Android thật trước khi chốt mỹ thuật.

## Kết quả kiểm chứng

- 7 kiểm thử backend qua: khóa thời gian trước/đúng/sau mốc, quyền phiên, cấu hình thiếu/sai, giới hạn thử qua restart, CSRF/origin, idempotency và sở hữu điều ước, retry và lease nhiều worker.
- Smoke test desktop/mobile qua trên HTTP và mở file trực tiếp, khi chặn thư viện 3D và CDN; vẫn xem ảnh/hộp thư, bật nhạc, ẩn/hiện UI.
- Intro cinematic và intro audio qua: ba hồi, cleanup renderer, autoplay bị chặn/được phép, bật muộn đồng bộ, tắt/bật, thiếu nhạc và giảm chuyển động.
- Luồng 2.0 qua trên desktop và viewport cảm ứng 390×844: ba hành tinh, ảnh lớn, hoàn thành trái tim/QA & YN/Cự Giải, tiến độ qua reload, thư và gửi điều ước với API mô phỏng, sao băng bắt được.
- Resilience qua: hủy chuyến bay, bass/treble với dữ liệu tổng hợp và tín hiệu từ nhạc thật, pause về nền, 20 lượt thăm hành tinh không tăng geometry/texture, mất WebGL khi ảnh lớn đang mở, phục hồi điều ước và khóa chống trùng sau reload khi request thất bại.
- Bản tương tác visual mới: hover mesh/nhãn không đóng băng quỹ đạo; heart/planet profile đã tăng kích thước và chuyển spring. Kiểm thử `universe_v2.cjs` xác nhận orbit debug tiếp tục thay đổi trong khi hover.
- Mẫu 60 giây mỗi viewport trên Chrome headless của máy phát triển, có bật nhạc: desktop 1440×960 khoảng 60,01 FPS; viewport cảm ứng 390×844 khoảng 60,01 FPS. Cả hai có p95 khoảng 16,7 ms, 18 draw calls, 10 geometry và 1 texture WebGL. Đây là đo khoảng cách requestAnimationFrame, không phải đo thời gian GPU hoặc kiểm tra điện thoại vật lý.
- Ảnh chụp kiểm tra bố cục lưu tại `output/playwright/v2-*.png`; dữ liệu mẫu hiệu năng tại `output/playwright/v2-performance.json` (thư mục output không vào git).

Chưa thực hiện gửi Telegram/email thật, mở thư cá nhân thật hoặc deploy công khai; các phần này phụ thuộc cấu hình mà chủ nhân chọn cung cấp sau.

## Trái tim ruby và Heart Focus

- Thêm `static/universe/heart.js`, tích hợp trong scene và thứ tự tải HTML. Lõi ruby 3D, bụi sao lấy mẫu theo diện tích tam giác, điểm lấp lánh bốn cánh chạy bằng shader.
- 14.000 hạt bụi + 64 sparkle trên desktop; 5.500 + 24 ở mobile/chế độ nhẹ. Không tăng số hạt khi phóng to; chỉ nội suy cường độ và kích thước.
- Phản sáng theo con trỏ ở Heart Focus, rung/nhịp theo cơ chế audio hiện có; chế độ giảm chuyển động dùng sparkle tĩnh. Hành tinh mờ rồi ẩn để không xuyên qua trái tim đang focus.
- Timer, phím Escape/Tab, chạm, nút đóng, resize và khôi phục WebGL dùng luồng Heart Focus hiện có. Fallback 2D đổi sang sắc ruby.
- Shader/tài nguyên thuộc vòng đời scene và được giải phóng khi mất WebGL hoặc đóng trang.

## Cosmic Energy Heart — bản hiện tại thay thế trái tim ruby tĩnh

- heart.js hiện vẽ một THREE.Points duy nhất với 70k/35k/16k điểm. Xóa lõi mesh và shader/pháp tuyến không còn sử dụng. Bộ lấy mẫu có seed cố định; các lớp core/mantle/corona được xen kẽ.
- Simplex noise và dòng xoáy tính trong vertex shader; các hạt corona có chu kỳ bay ra–bay lên–tan. Shader điều khiển màu hồng/cyan, lõi trắng, chấm tròn mềm và tia sáng thưa.
- scene.js dùng chung nhịp tim cho scale và plasma, nhận nhạc qua beatPulse; chế độ nhẹ vẫn chuyển động, reduced-motion tĩnh. Tự hạ chất lượng khi chậm kéo dài trong cả cảnh khám phá và focus.
- CPU chỉ truyền uniforms, không tải lại toàn bộ vị trí hạt mỗi frame. Mọi geometry/material vẫn thuộc resource owner của scene để giải phóng khi mất WebGL.

Kiểm chứng M8.2: Heart Focus desktop, touch 390×844, reduced-motion và WebGL fallback đều PASS; kiểm tra point-only và không lỗi shader/runtime. Mở file trực tiếp cũng PASS. Mẫu requestAnimationFrame 12 giây mỗi viewport trong Chrome headless trên máy phát triển: desktop 70k khoảng 60,04 FPS, mobile giả lập 35k khoảng 60,04 FPS, p95 khoảng 16,7 ms; scene focus có 12 geometry/1 texture. Đây không phải phép đo GPU hay điện thoại thật. Ảnh tại `output/playwright/cosmic-desktop.png` và `cosmic-mobile.png`.

Hồi quy M8.2: `tests/universe_v2.cjs` PASS desktop, touch mobile và reduced-motion; hành tinh, tái sử dụng GPU, chòm sao, capsule, điều ước và sao băng hoạt động.

## Chữ viết tắt và nhạc intro mặc định

- Toàn bộ nhãn đổi thành QA & YN. Mẫu nối sao có bốn chữ Q/A/Y/N, 21 điểm và 18 cạnh; giữ ID nội bộ qn, tăng version lên 2 để không dùng nhầm tiến độ cũ. Đồng bộ content/universe.json và static/memories.js cho cả Flask/file preview.
- Intro mặc định muốn phát nhạc: thử audio.play khi intro bắt đầu. NotAllowedError không còn bị coi là người dùng tắt tiếng; click/chạm cảnh hoặc Enter/Space sẽ thử phát trong thao tác người dùng. Nút tắt luôn được tôn trọng; bỏ qua intro không kích hoạt lại âm thanh.
- Trình duyệt vẫn có thể chặn tự phát có tiếng trước tương tác. Không ép vượt chính sách trình duyệt. Giữ đồng bộ nhạc với timeline intro và dọn listener/audio khi kết thúc.
- Kiểm thử intro_audio.cjs PASS: được phép autoplay, bị chặn rồi chạm để phát, mute/resume, kết thúc/bỏ qua, thiếu file và reduced-motion.

## Chòm sao Song Tử

Thêm mẫu `gemini` phiên bản 1, 14 điểm và 13 cạnh, cách điệu thành hai người sóng đôi nắm tay (không phải bản đồ thiên văn theo tọa độ sao). Có thông điệp khi hoàn thành và lưu tiến độ riêng. Thanh chọn chòm sao tự xuống dòng trên màn hình hẹp.
