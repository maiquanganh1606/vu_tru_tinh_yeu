# Nhạc nền Trung Thu

## Nguồn và quyết định phối

File người dùng cung cấp: `mid-autumn-festival-144765.mp3`, dài 157.44 giây. Các điểm cắt, tempo 152 BPM và lựa chọn cao độ dựa trên báo cáo nghe do người dùng gửi ngày 25/09/2026; chưa phải kết quả nghe độc lập của Codex. Nhận định tông A minor/C major trong báo cáo có độ tin cậy trung bình-thấp.

File gốc giữ nguyên tại Downloads. Ba asset web xuất bằng ffmpeg, stereo 44.1 kHz / 160 kbps, gain -2.3 dB; không thêm fade vào các điểm cắt vì được xử lý khi phát. Tổng tải khoảng 1.54 MB. Bản toàn bài `moon-festival.web.mp3` được giữ lại nhưng không còn tải trên trang.

| Cue | Khoảng MP3 gốc | Cách phát |
| --- | --- | --- |
| ambient.web.mp3 | 0–14.98s | Lượt đầu từ 0; sau đó lặp 2.35–14.98s, chồng chuyển tiếp equal-power 0.65s |
| journey.web.mp3 | 15.23–48.23s | Bắt đầu lại ở 0 của cue mỗi lần vào/xem lại cinematic 33s |
| outro.web.mp3 | 128.63–157.44s | 22s cinematic, giữ đuôi 6.81s trên màn kết rồi im lặng |

Chuyển cue equal-power 0.8s. Điểm loop và tempo vẫn cần người dùng nghe kiểm chứng trên thiết bị thật.

## Cân âm và hiệu ứng

Mức cinematic danh định = gain0.52 trước master0.35; các dB dưới đây tương đối với mức danh định:
- Ambient -8dB; phá cỗ -7dB; viết ước nguyện -9dB.
- Journey mở -2→0dB; Cuội -1dB; lân -3dB; chuyển phá cỗ -2→-5dB.
- Trống theo grid60/152s kể từ đầu cue, accent mạnh/nhẹ/vừa/nhẹ; bỏ chuông G5 lặp. Không phát hit sớm ngoài grid tại giây20. Mỗi hit duck thêm0.5dB, hồi0.2s.
- Thắp sao: C5/E5/G5/A5/C6, 0.65s; duck2.5dB.
- Nhận thư: C6, 1s, gain0.067; duck3dB, hồi0.5s.
- Outro -2/-1/-2/-1.5dB theo cảnh; giây16–22 giảm tới-4dB. Màn kết tiếp tục đúng phần đuôi, fade về0; bấm bỏ qua tới kết sẽ chuyển vào phần đuôi.

## Đồng hồ và vòng đời

`music-player.js` giải mã các cue ngắn khi cần. Buffer sources, gain envelopes và hiệu ứng dùng cùng AudioContext clock. Ambient được lên lịch trước để chuyển vòng không phụ thuộc một sự kiện timeupdate trễ. Tạm dừng hoặc ẩn tab suspend cùng một clock; khi hiện lại không chạy bù. Tắt tiếng chỉ mute master để giữ vị trí nhạc khớp hình khi bật lại.

Chuyển cảnh/xem lại vô hiệu kết quả tải cue cũ; chuyển đi trong lúc đuôi outro đang chạy cũng crossfade đuôi cũ. Khi file lỗi, dùng hiệu ứng tổng hợp dự phòng, không chặn UI. pagehide thực sự dispose sources, gain, timers và fetch.

Reduced motion giữ ambient khi người dùng chuyển cảnh thủ công, không chạy timed soundtrack/trống lặp. Chọn cảnh nhận thư phát chime một lần mỗi lượt xem. Đến kết fade ambient về im lặng.

## Kiểm tra

- `tests/mid_autumn_music.cjs`: MP3 thật, chuyển vòng ambient, cue cố định, replay, gain/duck, pause clock, mute, outro tail, reduced-motion chime, lỗi file và dispose.
- `tests/mid_autumn_audio.cjs`: chính sách autoplay cho phép/chặn, gesture, mute.
- `tests/mid_autumn_flow.cjs`, `tests/mid_autumn_lifecycle.cjs`: toàn hành trình và vòng đời trang.

Kiểm thử trình duyệt không thay thế đánh giá âm nhạc bằng tai hoặc nghiệm thu Safari/iPhone thật.
