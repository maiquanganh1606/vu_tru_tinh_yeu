# Kế hoạch cập nhật Trung Thu v2.1 — Đêm trăng đoàn viên

Ngày lập: 25/09/2026. Trạng thái: **đã triển khai bản tích hợp cục bộ; kiểm thử thư–tay đạt; nghiệm thu thiết bị thật còn chờ**.

Xem [kết quả triển khai và giới hạn nghiệm thu](MID_AUTUMN_V2_1_RELEASE_NOTES.md). Các mục bên dưới giữ nguyên tiêu chí kế hoạch để đối chiếu.

Tài liệu này nối tiếp [concept v2.1](MID_AUTUMN_V2_1_PROPOSAL.md) và [preview cinematic](MID_AUTUMN_CINEMATIC_PREVIEW.md). Mục tiêu là hoàn thiện một trải nghiệm Trung Thu có cinematic làm trọng tâm, với đoạn nhận thư đáng tin cậy trên desktop và điện thoại, sau đó tích hợp thành trang phụ trong cùng website.

## 1. Trải nghiệm cần hoàn thành

**Thắp 5/5 cánh sao → cinematic lên cung trăng → phá cỗ → gửi ước nguyện lên cung trăng → cinematic nhận thư → kết thúc.**

- Cánh sao thứ năm tự mở cinematic chính đúng một lần. Cung trăng, Chú Cuội và múa lân là những cảnh chủ đạo, có bố cục, diễn xuất và nhịp chuyển rõ ràng.
- Phá cỗ là khoảng nghỉ tương tác trước khi viết ước nguyện. Toàn bộ giao diện hành trình mới dùng “ước nguyện” thay cho màn “Lời chúc”.
- Outro phải cho người xem thấy thư **đến tay Chị Hằng, được đón nhận rồi mới hóa ánh sáng**, với Chú Cuội trong cảnh. Sau đó chuyển sang màn kết thúc có nội dung ước nguyện, xem lại và về trang chính.
- Giữ thời lượng tham chiếu hiện tại: cinematic chính khoảng 33 giây, outro khoảng 22 giây. Chỉnh nhịp trong từng cảnh để hành động rõ hơn; không kéo dài chỉ để thêm hiệu ứng.
- Cùng một Flask app: trang phụ `/trung-thu/`, trang `/` thêm liên kết vào trải nghiệm. Tài nguyên và vòng đời Trung Thu độc lập với Universe.
- Ước nguyện chỉ tồn tại trong bộ nhớ phiên trang; hành động gửi là một phần câu chuyện. Lưu dữ liệu, email, tài khoản, API và schema cơ sở dữ liệu nằm ngoài kế hoạch này.

## 2. P0 — Sửa thư bay lệch khỏi tay Chị Hằng

### Bằng chứng hiện có

Người dùng báo lỗi xảy ra không thường xuyên. Kiểm tra mã nguồn cho thấy các thành phần đang dùng những hệ tọa độ khác nhau:

| Thành phần | Cách đặt vị trí hiện tại | Rủi ro cần kiểm chứng |
| --- | --- | --- |
| Chị Hằng | CSS theo phần trăm chiều cao/vị trí, có scale, xoay và nhấp nhô | Điểm tay thay đổi theo viewport, breakpoint và thời gian diễn hoạt. |
| Thư Three.js | Hai đường cong có điểm cuối cố định cho desktop/mobile | Điểm cuối không được tính từ tay đang hiển thị. |
| Resize | Cập nhật kích thước renderer và camera aspect | Đường cong chỉ được tạo lại khi đổi nhóm mobile/desktop; resize trong cùng nhóm vẫn giữ điểm cuối cũ. |
| Thư CSS khi thiếu WebGL | Nội suy đến các phần trăm `left/top` riêng | Bản nhẹ cũng chưa có điểm nhận thư chung với nhân vật. |
| Đồng hồ | Tiến độ phim dùng `elapsed`; chuyển động nhân vật dùng `runtime` tích lũy riêng | Cần kiểm tra khác biệt khi phát lại, tốc độ khung hình giảm hoặc tạm dừng. |

Nguồn: `renderStory()`, `pose()`, `tick()`, `resize()` trong [JavaScript preview](mid-autumn-preview.js); `.actor`, `.actor-hang` và media queries trong [CSS preview](mid-autumn-preview.css).

**Giả thuyết ưu tiên:** đích thư cố định trong không gian 3D không bám theo tay trong bố cục CSS responsive. Đây là bằng chứng từ cấu trúc code; chưa có phép đo tái hiện để kết luận đây là nguyên nhân duy nhất. Kiểm thử trước xác nhận luồng chạy hết và nhân vật xuất hiện, chưa đo độ khớp thư–tay.

### Công việc và thứ tự

1. **Tạo ca tái hiện trước khi sửa.** Thêm chế độ kiểm tra cục bộ cho phép dừng chính xác tại các mốc outro 12, 14, 15 và 16 giây, hiện điểm tay, điểm tiếp xúc thư và khoảng cách bằng CSS pixel. Ghi viewport, DPR, thời điểm, trạng thái phát lại và ảnh chụp; giữ lại ít nhất một trường hợp bản cũ bị lệch làm kiểm thử hồi quy.
2. **Định nghĩa điểm neo trên artwork.** Hiệu chỉnh một tọa độ chuẩn hóa `(u, v)` ở vị trí nhận thư giữa hai tay trên ảnh Hằng gốc, tính cả phần trong suốt của ảnh. Lưu cùng metadata phiên bản artwork. Khi thay ảnh hoặc crop ảnh phải cập nhật điểm neo.
3. **Cho điểm neo đi cùng nhân vật.** Bọc ảnh và marker neo trong cùng một phần tử chịu transform. Đọc tâm marker sau scale/rotate/translate; không suy ra điểm tay bằng tỷ lệ trên bounding box của cả ảnh đã xoay. Với art tách lớp, marker gắn vào lớp bàn tay.
4. **Dùng một đích chung.** Quy đổi vị trí marker từ CSS pixel tương đối với canvas sang NDC, chiếu ngược qua camera tới mặt phẳng nhận thư. Điểm này dùng chung cho thư, điểm cuối vệt sáng và quầng sáng nhận thư. Thư fallback CSS lấy cùng tọa độ màn hình; không có bộ hằng số mobile/desktop riêng cho đích nhận. Không nhân CSS pixel thêm với DPR.
5. **Tách hành động bay và nhận.** Ba trạng thái: `approach → docked → dissolve`. Đoạn cuối giảm tốc và ổn định góc thư; điểm tiếp xúc đã định nghĩa trên mép dưới thư chạm đúng neo tay. Khi `docked`, thư theo tay từng khung hình ít nhất khoảng một giây, rồi mới tan. Quầng sáng xuất hiện khi tiếp xúc, không bật trước để che sai lệch.
6. **Đồng bộ nhịp và bố cục.** Chuyển động nhân vật và thư trong cinematic cùng lấy mẫu từ đồng hồ của đoạn phim. Khi resize/xoay máy, cập nhật camera và neo; thư đang bay chuyển tiếp đường còn lại từ vị trí đang thấy, không khởi động lại phim. Thư đã nhận tiếp tục bám tay. Chỉ đo lại bố cục khi cần, tránh đọc/ghi layout lặp cho từng hạt sáng.
7. **Xử lý thiếu artwork.** Nếu ảnh Hằng chưa giải mã xong, chờ có trạng thái tải rõ ràng. Nếu ảnh lỗi, dùng cảnh kết thúc nhẹ có nội dung đầy đủ, không cho thư bay tới một “bàn tay” vô hình.

### Tiêu chí đóng lỗi

- Trong đoạn `docked`, sai số giữa điểm tiếp xúc thư và neo tay **không quá 8 CSS pixel** ở toàn bộ cấu hình bắt buộc bên dưới; kiểm tra xuyên suốt đoạn nhận, không chỉ một ảnh tại một thời điểm.
- Người kiểm tra xác nhận neo đúng trên lòng bàn tay trong ảnh thực tế, thư không xuyên cổ tay hoặc lơ lửng. Phép đo tự động phải đi cùng ảnh kiểm chứng; hai giá trị cùng dùng một neo đặt sai không đủ để nghiệm thu.
- Resize, xoay máy, pause/resume và replay không làm thư rời tay sau khi nhận; trong lúc bay không xuất hiện cú nhảy tách rời chuyển động bố cục hoặc reset tiến độ.
- WebGL, fallback CSS và reduced motion đều thể hiện được hành động nhận thư đúng vị trí. Storyboard reduced motion có riêng trạng thái đã nhận để kiểm tra.
- Ca tái hiện thất bại trên bản cũ và đạt trên bản sửa. Lưu ảnh trước/sau cùng cấu hình để đối chiếu.

## 3. P1 — Hoàn thiện cinematic chính

Cinematic sau 5/5 là hạng mục chất lượng chính của v2.1. Ưu tiên bố cục và hành động đọc được trước khi tăng số hạt, bloom hoặc hiệu ứng camera.

| Cảnh | Thời lượng tham chiếu | Nâng cấp cần làm | Dấu hiệu đạt |
| --- | --- | --- | --- |
| Chiếc đèn mở lối | 0–3,2 s | Năm cánh sáng hội tụ; ánh đèn dẫn hướng vào cảnh; phản hồi âm thanh ngắn khi bật âm. | Chuyển tiếp liền từ chiếc đèn vừa thắp, không lóe trắng hoặc cắt đen. |
| Xuyên mây | 3,2–8 s | Các lớp mây có chiều sâu; chuyển động đèn và camera cùng hướng; giảm tốc trước khi lộ cung điện. | Người xem hiểu mình đang đi lên cung trăng; không bị che toàn cảnh quá lâu. |
| Cung trăng hiện ra | 8–13,5 s | Một toàn cảnh đủ thời gian ngắm; thống nhất ánh sáng, cây đa, sân điện và chiều sâu tiền/trung/hậu cảnh. | Điện thoại vẫn thấy đặc trưng cung trăng, không chỉ một vùng crop mây hoặc nhân vật. |
| Cuội đón khách | 13,5–20 s | Dàn tư thế chào có chuẩn bị, hành động, nghỉ; tách chữ khỏi mặt và tay. | Cuội có hành động đón khách rõ, giữ được sự ấm áp và nhịp thở của cảnh. |
| Múa lân | 20–29 s | Biên đạo ngắn: chào → nhún/bước → ngẩng đầu → kết; đầu, thân và chân chuyển động có quan hệ; trống đúng nhịp, bóng tiếp đất khớp. | Nhìn ra một bài múa ngắn; chuyển động có trọng lượng, không chỉ nảy cả hình. |
| Mời phá cỗ | 29–33 s | Hạ nhạc và chuyển động; nối sân hội với mâm cỗ; đưa focus đến bước tiếp theo. | Nhịp dịu tự nhiên, không giữ overlay/canvas chặn thao tác phá cỗ. |

**Hướng triển khai:** tiếp tục sân khấu 2.5D với đèn/thư/hiệu ứng 3D, bổ sung artwork tách lớp và các khớp chuyển động cho Cuội/lân/Hằng theo nhu cầu từng cảnh. Thử cảnh lân ngắn trước để kiểm chứng chất lượng. Không coi chuyển động nguyên sprite hiện tại là đủ để đóng hạng mục múa lân. Nếu art tách lớp không đạt diễn xuất đã đặt ra, thay riêng cảnh đó bằng animation dựng sẵn hoặc rig phù hợp; không cần viết lại toàn bộ website thành cảnh nhân vật 3D.

Tạo ảnh bố cục chuẩn cho desktop, mobile dọc và mobile ngang; kiểm tra điểm nhìn, khoảng trống cho chữ và vùng nút điều khiển ở từng cảnh. Chốt lớp bàn tay nhận thư trước khi hiệu chỉnh neo cuối cùng.

## 4. P1 — Hoàn thiện outro và cảm giác kết thúc

| Nhịp | Thời gian tham chiếu | Công việc |
| --- | --- | --- |
| Gấp điều ước | 0–4 s | Thư đóng lại rõ; khóa thao tác gửi lặp; chuyển từ form sang cảnh không giật bố cục. |
| Bay lên cung trăng | 4–10 s | Đường bay có chiều sâu, vệt sáng ngắn và mềm; hướng bay dẫn mắt tới nơi nhận. |
| Hằng và Cuội đón nhận | 10–16 s | Cho thấy hai nhân vật trước khi thư đến; thư giảm tốc, chạm tay rồi giữ lại. Cử chỉ Hằng và ánh nhìn/bố cục Cuội hướng về thư. |
| Giữ lại ánh sáng | 16–22 s | Thư tan từ điểm tiếp xúc, ánh sáng lan vừa đủ lên tay/mặt; máy quay lùi nhẹ; giữ một nhịp yên trước màn kết. |

- Tách lớp tay phía trước khi cần để mép thư được che đúng, tránh thư trông như dán nổi trên toàn bộ nhân vật.
- Quầng sáng, vệt sáng và âm thanh nhận thư cùng đi theo sự kiện tiếp xúc thực tế, không phụ thuộc các mốc rời rạc mâu thuẫn nhau.
- Màn kết giữ ước nguyện dễ đọc, có “Về vũ trụ”, “Xem lại đoạn kết”, “Bắt đầu lại”. Replay giữ nội dung, reset xóa nội dung và đưa đèn về 0/5.
- Tắt âm thanh vẫn hiểu trọn câu chuyện. Reduced motion có cảnh thư trong tay và cảnh ánh sáng kết thúc; không ép xem đường bay.

## 5. P2 — Tách mã và tích hợp cùng website

Tách phần điều phối trạng thái/timeline khỏi bố cục/điểm neo, dựng hình và âm thanh. Quy tắc chuyển bước, pause, skip, replay và kết thúc dùng chung; giao diện DOM và Three.js cùng nhận một thời điểm cảnh. Thu hồi animation frame, listener, audio node và tài nguyên GPU khi rời trải nghiệm.

| Vị trí dự kiến | Thay đổi |
| --- | --- |
| `server/__init__.py` | Thêm GET `/trung-thu/` render template riêng. |
| `templates/mid-autumn/index.html` | Trang phụ, cấu trúc ngữ nghĩa, form ước nguyện và vùng cinematic. |
| `static/mid-autumn/` | CSS có phạm vi riêng; module trạng thái, timeline, sân khấu/điểm neo, renderer, âm thanh và asset manifest. Chia file theo trách nhiệm thực tế. |
| `templates/index.html` | Thêm liên kết vào Trung Thu, phù hợp điều hướng hiện có. |
| `tests/mid_autumn_flow.cjs` | Luồng 5/5 → kết thúc, điều khiển, nhập liệu và fallback. |
| `tests/mid_autumn_alignment.cjs` | Ca hồi quy thư–tay, viewport, resize, replay và sai số đo được. |
| `tests/test_backend.py` | Route trả trang phụ thành công; trang chính và API hiện có vẫn hoạt động. |

Trang chính không tải renderer hoặc artwork Trung Thu trước khi vào trang phụ. Trang phụ dùng Three.js vendor cục bộ sẵn có; không import runtime Universe. Khi trở về, liên kết trỏ `/`. Kiểm thử mạng xác nhận viết/gửi/xem lại ước nguyện không gọi `/api/wishes` hoặc dịch vụ bên ngoài.

## 6. P2 — Tải tài nguyên, thiết bị yếu và khả năng tiếp cận

- Tạo biến thể ảnh theo kích thước hiển thị và định dạng nén phù hợp; giữ alpha cho nhân vật. Asset gốc hiện khoảng 9 MB. Mục tiêu sơ bộ: tổng asset hình của phiên mobile không quá 4 MB; ghi số đo thực tế sau khi tối ưu, không coi mục tiêu là kết quả đã đạt.
- Tải phần mở đầu trước; giải mã/preload cảnh kế tiếp trong lúc thắp đèn. Có trạng thái tải, thử lại và phương án tiếp tục khi asset lỗi; không kẹt ở màn trắng.
- Giới hạn DPR/particle phù hợp, tái sử dụng geometry/material; đo tối thiểu một iPhone và một Android thật. Mục tiêu ban đầu ở chất lượng mobile: p95 thời gian khung hình không quá 33 ms trong hai cinematic; nếu không đạt thì giảm hiệu ứng và đo lại. Desktop hướng tới 60 fps.
- Ẩn tab dừng tiến độ/âm thanh; quay lại không nhảy cảnh. Mất WebGL giữa phim chuyển sang bản nhẹ và giữ tiến độ hợp lý. Replay nhiều lần không nhân số vòng render hoặc tích lũy audio node.
- Giữ nút pause/skip và focus bàn phím; vùng chạm tối thiểu 44×44 CSS pixel; văn bản rõ trên nền. Không để footer, safe area hoặc bàn phím mobile che form/nút gửi.
- Reduced motion dùng storyboard thủ công; không chạy vòng diễn hoạt liên tục. Bật/tắt thiết lập giữa phiên vẫn giữ đúng bước.

## 7. Ma trận kiểm tra và điều kiện phát hành

| Nhóm | Cấu hình / tình huống bắt buộc |
| --- | --- |
| Bố cục | 1440×900, 1280×720, 1024×768, 820×1180, 390×844, 360×800, 320×568, 812×375. |
| Ranh giới responsive | Rộng 759, 760, 761 px; resize trong cùng breakpoint và qua breakpoint ở các mốc bay/nhận thư. |
| Tỉ lệ hiển thị | DPR 1/2/3 trên cấu hình đại diện; zoom trình duyệt 80%/125%/200%; không nhầm pixel thiết bị với CSS pixel. |
| Trình duyệt | Chrome desktop; Safari/iOS và Chrome/Android thật. Giả lập dùng để bắt hồi quy, thiết bị thật dùng để chốt hiệu năng và bố cục động. |
| Vòng đời | Lần đầu, replay 5 lần, pause/resume trước/sau khi nhận thư, ẩn/hiện tab, xoay máy, thanh trình duyệt mobile đổi chiều cao. |
| Khả năng phục hồi | Reduced motion, tắt âm, Three.js không tải, mất WebGL giữa cảnh, ảnh tải chậm/lỗi. |
| Nội dung | Ước nguyện trống/chỉ khoảng trắng bị chặn; 240 ký tự; tiếng Việt và emoji; ký hiệu HTML hiển thị như văn bản; nhấn gửi nhanh nhiều lần không mở nhiều outro. |
| Tích hợp | Route trực tiếp/reload/về `/`; kiểm tra tài nguyên trang chính; chạy bộ kiểm thử backend và hồi quy Universe hiện có theo README. |

Chỉ coi v2.1 sẵn sàng phát hành khi đồng thời đạt:

1. Ca hồi quy thư–tay đạt bằng số đo **và** kiểm tra hình ảnh; mọi nhánh nhận thư dùng cùng neo.
2. Cinematic chính đủ cung trăng, Cuội và bài múa lân có diễn xuất; outro có khoảnh khắc nhận thư rõ ràng trước khi tan sáng.
3. Luồng, điều khiển, fallback, nội dung và khả năng tiếp cận đạt ma trận liên quan; không lỗi JavaScript chưa xử lý.
4. Trang chính chỉ thêm liên kết, không phát sinh tài nguyên/render loop Trung Thu; kiểm thử 2.0 không hồi quy.
5. Có báo cáo dung lượng, thời gian khung hình và ảnh/video kiểm chứng trên thiết bị thật. Nếu chưa có thiết bị thật, ghi rõ phần đó chưa nghiệm thu.

## 8. Thứ tự thực hiện và đầu ra từng mốc

| Mốc | Việc chính | Đầu ra trước khi chuyển mốc |
| --- | --- | --- |
| M1 — Khóa lỗi nhận thư | Tái hiện, đo sai số, neo tay chung, docking, đồng hồ và resize. | Ca kiểm thử đỏ→xanh; ảnh trước/sau; bản preview nhận thư đúng trên ma trận viewport. |
| M2 — Hoàn thiện phim | Bố cục, art tách lớp, động tác Cuội/lân/Hằng, nhạc/ánh sáng, nhịp kết. | Bản preview desktop/mobile hoàn chỉnh; hiệu chỉnh lại neo nếu artwork đổi; M1 vẫn đạt. |
| M3 — Đưa vào ứng dụng | Tách module/vòng đời, route/template/static và liên kết từ trang chính. | Chạy trọn luồng trên Flask; route/API hiện có không hồi quy. |
| M4 — Chốt chất lượng | Tối ưu asset, đo thiết bị thật, fallback/accessibility, chạy kiểm thử tổng. | Checklist nghiệm thu có bằng chứng và bản ứng viên phát hành. |

Ưu tiên triển khai đầu tiên là **M1**, sau đó tập trung chất lượng **M2** trước khi đưa sang trang thật. Chưa đặt lịch ngày vì thời lượng phụ thuộc mức bổ sung artwork/diễn hoạt và kết quả đo trên điện thoại. Không tự thêm khóa sự kiện theo ngày. Việc triển khai lên môi trường công khai là bước riêng sau khi bản ứng viên đạt các điều kiện trên.
