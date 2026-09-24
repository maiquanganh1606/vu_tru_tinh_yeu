# Vũ trụ tình yêu 2.0 — Trạng thái triển khai

Ngày cập nhật: 24/09/2026. Big Update 2.0 triển khai trên Flask + JavaScript + Three.js hiện có. Bản nền đã được đưa lên GitHub và Render; đợt hoàn thiện này chốt game xếp hình và các chỉnh sửa giao diện theo phản hồi của chủ nhân.

## Đã có

- Một cảnh chính với trái tim, nebula và ba hành tinh, camera focus/quay về, ảnh xem trước và album đầy đủ. Một vòng lặp quản lý hiệu ứng, camera, sao băng và tín hiệu âm thanh.
- Chòm sao trái tim, QA & YN, **Cự Giải** và **Song Tử**, cùng các mức khó bổ sung cho hai cung. Chuột, kéo/chạm và bàn phím; nhiều nét, lùi nét, vẽ lại, lưu tiến độ theo phiên bản.
- Sao băng có vùng bắt 56 px, chuyển động cùng dữ liệu hit target; bắt được dừng cảnh một giây rồi mở form. Có đường gửi điều ước trực tiếp cho người dùng giảm chuyển động.
- SQLite lưu điều ước và outbox trong cùng giao dịch; chống trùng theo phiên + khóa request. Worker riêng với lease và retry; adapter Telegram hoặc SMTP STARTTLS. Brevo SMTP đã hoạt động trên Render và chủ nhân xác nhận nhận được email điều ước.
- Thư tương lai kiểm tra đáp án hash và thời điểm tại server. Metadata không kèm thư, mỗi lần đọc kiểm tra lại quyền phiên và giờ mở; giới hạn thử được lưu trong DB. Có script tạo cấu hình riêng bằng nhập đáp án ẩn.
- Tách dải bass/mid/treble bằng FFT 2.048, ngưỡng beat thích ứng, làm mượt tín hiệu, ảnh hưởng sao/trái tim/mây. Bật nhạc theo thao tác người dùng, file preview có fallback HTML audio.
- Giữ intro 28 giây và nhạc intro; phục vụ Three.js r128 tại chỗ, kèm giấy phép MIT. Intro và album dùng thumbnail; ảnh lớn vẫn là bản gốc.
- 50 thumbnail tổng 1,94 MiB so với 42,29 MiB ảnh gốc. Bản nhạc web khoảng 12 MB (128 kbps), bản gốc vẫn giữ nguyên.
- Chế độ nhẹ, giảm chuyển động, tạm ngừng cảnh khi tab ẩn, điều hướng bàn phím và focus trap modal, fallback DOM khi không có WebGL.
- Cảnh chính đã cập nhật chuyển động tương tác: trái tim lớn hơn theo profile desktop/mobile; hành tinh và halo lớn hơn; hover mesh/nhãn dùng `hoveredPlanetId`, spring scale/glow/lift/opacity và camera parallax. Quỹ đạo tiếp tục chuyển động khi hover thay vì đóng băng.

## Nội dung còn cần chủ nhân chuẩn bị

Kênh nhận điều ước đã cấu hình qua Brevo SMTP, cổng 2525 trên Render. Thông tin xác thực và địa chỉ email riêng chỉ lưu trong môi trường triển khai. Khi kênh nhận tạm lỗi, điều ước vẫn được lưu ở trạng thái chờ và worker retry; giao diện chỉ báo đã gửi khi có kết quả gửi thành công.

Chưa có ngày mở thư, câu hỏi/đáp án và thư cá nhân nên capsule hiện lời nhắn “Anh đang chuẩn bị lá thư này”. Engine khóa thời gian đã có và được kiểm thử bằng dữ liệu thử riêng; không điền một đáp án hoặc ngày mở giả vào production.

Album mặc định gồm tất cả ảnh, nhóm file Locket và nhóm file Messenger. Đây là phân nhóm từ tên file có sẵn, không phải suy đoán ngày hẹn/giận hờn. Chỉnh `content/universe.json` để đổi thành các cột mốc thật và thêm chú thích/ngày.

## Cấu trúc

- `server/`: factory Flask, capsule, SQLite, outbox/delivery.
- `static/universe/`: core/API/modal, camera, scene, audio, planets/gallery, constellations, meteors, wishes, capsule, heart và energy vortex.
- `content/universe.json`: nội dung công khai, cờ tính năng, mẫu chòm sao.
- `instance/`: dữ liệu riêng không vào git; cần volume bền vững khi deploy.
- `scripts/build_thumbnails.py`, `configure_capsule.py`, `deliver_wishes.py`: công cụ vận hành.

## Giới hạn thực tế

- Tiến độ chòm sao lưu trên trình duyệt, chưa đồng bộ nhiều máy.
- Không bảo vệ toàn bộ website bằng đăng nhập. Câu hỏi kỷ niệm chỉ bảo vệ thư tương lai và có thể dễ đoán nếu nội dung câu hỏi phổ biến.
- Nhà cung cấp có thể đã nhận thông báo trước khi timeout; retry có thể gửi trùng thông báo dù chỉ có một điều ước trong DB. Mã điều ước giúp nhận diện.
- SQLite/outbox thiết kế cho một host với volume bền vững. Chạy nhiều host cần chuyển sang DB chung trước.
- Việc kiểm tra trên viewport cảm ứng/giảm chuyển động không thay thế đo GPU, âm thanh và thao tác trên iPhone/Android thật.
- Website đã hoạt động tại [vu-tru-tinh-yeu.onrender.com](https://vu-tru-tinh-yeu.onrender.com/). Bản local dùng cùng ứng dụng; việc nghiệm thu GPU/audio/cảm ứng trên iPhone/Android thật và chuẩn bị nội dung thư cá nhân vẫn là các công việc riêng chưa được xác nhận.

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

Các kết quả ban đầu bên trên thuộc đợt kiểm tra local ngày 21/09. Đến 24/09, website đã triển khai trên Render và chủ nhân đã xác nhận email điều ước thật đến hộp thư. Chưa xác nhận mở thư cá nhân thật hoặc gửi Telegram.

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

## Energy Vortex M8.3 — lịch sử, đã được M8.4 thay thế (21/09/2026)

### Đã triển khai

- Thêm `static/universe/vortex.js` như một module hạt độc lập, dùng một `THREE.Points`, một geometry và một shader riêng.
- Sinh 15.000 hạt có seed cố định với các thuộc tính `aRadius`, `aAngle`, `aPhase`, `aSeed` và `aSize`. Không cập nhật vị trí từng hạt trên CPU.
- Vertex shader thực hiện ba giai đoạn liên tục: hội tụ từ rìa phễu, updraft xoắn theo trục Y và fade/respawn theo lifecycle.
- Fragment shader dùng soft particle additive blending, chuyển màu cyan đậm → cyan sáng → trắng-cyan, kèm sparkle thưa.
- `heart.js` cung cấp `bounds()` để scene neo vortex vào `minY` thực tế của trái tim thay vì dùng tọa độ hard-code.
- `scene.js` truyền chung `elapsed`, `beat`, `heartMix`, pointer và opacity cho cả heart/vortex. Khi beat đạt đỉnh, vortex tăng tốc xoay và độ sáng theo cùng xung lực của trái tim.
- Vortex đi theo chóp tim khi mở Heart Focus; đã nhận pointer chuột/cảm ứng/bút và giảm strength theo thời gian. Audit ngày 22/09 xác định vị trí pointer chưa được làm mượt và mapping sang mặt phẳng bệ cần sửa ở M8.4.
- Đồng bộ quality hiện có: 15.000 hạt ở High, 8.000 ở Balanced, 4.000 ở Light/reduced-motion. Vortex nằm trong resource owner của scene và được dọn khi WebGL mất hoặc trang đóng.
- Thêm feature flag `features.energyVortex` và cập nhật snapshot `static/memories.js`.
- Thêm kiểm thử browser `tests/energy_vortex.cjs` cho anchor, focus pointer, quality và reduced motion.

### Cần xác nhận trước khi phát hành

- Chạy `node tests/energy_vortex.cjs` cùng bộ browser tests hiện có trên máy có Node.js, Playwright và Chrome.
- Chụp và xem lại desktop 1440×960, touch 390×844, reduced motion và có/không có audio để hiệu chỉnh bán kính, chiều cao, opacity và độ trắng ở lõi.
- Đo frame time/GPU thật trên thiết bị di động; mục tiêu là không tăng quá một draw call và giữ p95 dưới 20 ms desktop, 25 ms mobile.
- `scripts/build_thumbnails.py` cần môi trường có Pillow nếu muốn tái tạo toàn bộ thumbnail; snapshot cấu hình hiện đã được cập nhật bằng `image_catalog.py`.

## M8.4 — Bệ năng lượng theo video, đã triển khai (22/09/2026)

Thay thiết kế M8.3 bằng đĩa hạt bền vững có lõi cyan trắng, các cung sáng hở và ít bụi nối vào chóp tim. `vortex.js` sinh ba lớp hạt xen kẽ 80/10/10 và một mesh ribbon; High/Balanced 15k/8k + 8/4 cung (2 draw calls), Light 4k và tắt ribbon (1 draw call). Không thêm bloom hoặc texture.

`scene.js` dùng heart bounds và scale bố cục để neo bệ, dự phòng khoảng hở khi beat, giữ elip thấp; chỉnh focus framing và cập nhật profile khi resize. Clock tích phân vận tốc thay `time × beat`, pointer chuyển qua ray-plane/local và smoothing có giới hạn. `app.js` phân biệt kéo/chạm trên backdrop bằng pointer capture; CSS đưa nút mở xuống dưới bệ và giới hạn touch-action ở backdrop. Reduced motion tắt clock/beat/deformation; visibility reset delta để tiếp tục không cộng bù khoảng nghỉ.

Kiểm chứng: `energy_vortex.cjs`, `heart_focus.cjs`, `universe_v2.cjs`, `universe_resilience.cjs` PASS. Có touch/pen CDP thực, đa chạm/cancel, profile/resource IDs, 5/60/600 giây clock mô phỏng ở 30/60/120 Hz, ROI tĩnh pixel-identical, tắt feature flag, file preview và fallback/context loss. Syntax và diff whitespace đã kiểm tra.

Ảnh/clip và JSON số đo nằm trong `output/playwright/vortex-*`; ảnh so sánh lưu trong `docs/assets/energy-vortex-upgrade-*.jpg`. Chrome headless trên Apple M1 Pro: rAF p95 16,7–16,8 ms cho desktop và viewport touch 390×844, có/không nhạc. GPU timer p95 khi bật nhạc: 2,66 ms desktop, 0,67 ms viewport mobile. Toàn cảnh focus 15 calls/14 geometry/1 texture; tăng một call/geometry so baseline M8.3, số điểm giữ nguyên. Chưa đo GPU baseline hay thiết bị di động thật.

[Kế hoạch và bằng chứng chi tiết](ENERGY_VORTEX_UPGRADE_PLAN.md). M8.4a–d hoàn tất, kiểm tra Chrome/macOS đã qua; M8.4e trên Safari iOS/Chrome Android thật chưa được xác nhận. Burst xuất hiện là tùy chọn chưa bật. M8.4 đã có trong bản nền trên GitHub/Render. Các mục M8.3 phía trên được giữ làm lịch sử và đã được M8.4 thay thế.

### Tinh chỉnh cân bằng ánh sáng (22/09/2026)

Tăng sáng mantle/hồng và kích thước hạt thân tim 8%; giảm độ sáng, độ phủ lõi vortex và flash theo beat để tim nổi bật hơn bệ. Số hạt và draw calls giữ nguyên. Xem ảnh desktop/mobile/Light ở `output/playwright/light-balance-*.png`; `heart_focus.cjs` và `energy_vortex.cjs` chạy lại PASS. Ảnh trước/sau lưu tại `docs/assets/heart-vortex-light-balance.jpg`.

## Hoàn thiện game xếp hình (24/09/2026)

- Bốn mức 3 × 3, 4 × 4, 5 × 5, 6 × 6; ảnh dọc/ngang giữ tỉ lệ gốc, không cắt hàng mảnh ghép trên màn hình thấp.
- Bàn chơi và ảnh mẫu được phóng to. Toàn cửa sổ dùng một vùng cuộn chung; hai ảnh bám trong màn hình khi phần tiêu đề, trạng thái và nút cuộn.
- Nút **Ẩn số / Hiện số** dùng cùng kiểu với **Ẩn hình mẫu / Hiện hình mẫu**, đổi được trong lúc chơi. Không xáo bàn, đặt lại nước đi hoặc đồng hồ; lựa chọn giữ trong phiên trang hiện tại.
- Giữ tạm dừng/tiếp tục, chơi lại, đổi ảnh/độ khó, âm thanh và kỷ lục trên thiết bị. Nút và bàn vẫn dùng được bằng bàn phím.
- `tests/puzzle-layout.cjs` kiểm tra tỉ lệ, đủ hàng/cột, nhãn số, cuộn chung, giới hạn sticky, xoay màn hình và tạm dừng ở bốn viewport. Chạy được với file HTML trực tiếp và Flask.

## Kiểm tra chốt Big Update 2.0 (24/09/2026)

- 7 kiểm thử backend, biên dịch Python, kiểm tra cú pháp 23 file JavaScript và cấu hình Gunicorn đều qua.
- 9 bộ kiểm thử browser qua trong 11 lượt chạy: mini game và bố cục xếp hình đều kiểm tra bằng HTTP lẫn file; smoke, hành trình 2.0, Heart Focus, energy vortex, resilience, intro cinematic và intro audio đều qua.
- Sửa mốc đo trong kiểm thử resilience: lấy số tài nguyên sau khi chuyển sang chế độ nhẹ, rồi so sánh sau 20 lượt thăm hành tinh. Chuyển chất lượng chủ động giải phóng một texture; đó không phải rò rỉ tài nguyên.
- Nút ẩn/hiện số được kiểm tra riêng trên desktop/mobile: nhãn và kiểu dáng đúng, ẩn/hiện được trong ván chơi, không thay đổi bàn, nước đi hoặc đồng hồ.
- Hoàn tất phạm vi mã nguồn của Big Update 2.0. Nội dung thư riêng và nghiệm thu điện thoại vật lý vẫn được ghi rõ là chưa xác nhận; các số đo Chrome không đại diện cho GPU điện thoại thật.
