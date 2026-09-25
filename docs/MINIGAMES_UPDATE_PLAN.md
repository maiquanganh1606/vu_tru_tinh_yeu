# Kế hoạch update mini game trong Big Update 2.0

Ngày lập: 23/09/2026
Phạm vi: bổ sung hai mini game vào website **Vũ trụ tình yêu 2.0**.

## 1. Phạm vi và cách hiểu yêu cầu

### Trong phạm vi

1. Mở rộng **Nối chòm sao** với bốn mức: Dễ hiện tại, Trung bình, Khó và Rất khó.
2. Thêm **Sliding Picture Puzzle** dùng ảnh từ catalog ký ức hiện có.
3. Puzzle cho phép chọn ảnh hoặc lấy ảnh ngẫu nhiên, bật/tắt hình mẫu, chọn độ khó, bấm giờ và lưu kỷ lục.
4. Giữ trải nghiệm riêng tư, ưu tiên điện thoại, chạy được khi mở bằng Flask và vẫn có fallback `file://` như Big Update 2.0.

Ảnh đính kèm chỉ là hình minh họa cho kiểu hình có thể tạo khi nối sao. Không có chỉ dẫn chữ hoặc yêu cầu kỹ thuật ẩn trong ảnh; nội dung cần triển khai được lấy từ hai gạch đầu dòng của yêu cầu.

### Ngoài phạm vi bản đầu

- Không nhận dạng hình vẽ tự do bằng AI.
- Không đưa bảng xếp hạng công khai.
- Không đồng bộ kỷ lục giữa nhiều thiết bị bằng tài khoản. Kỷ lục bản đầu lưu trên thiết bị bằng `localStorage`; nếu cần đồng bộ, đó là một hạng mục API riêng.
- Không tải toàn bộ ảnh gốc khi mở trang. Game dùng thumbnail hoặc bản ảnh đã thu nhỏ theo kích thước bàn chơi.

## 2. Baseline cần giữ

- Entry point và vòng đời cảnh nằm ở `static/app.js`, `static/universe/core.js` và `scene.js`.
- Nối sao hiện có các mẫu `heart`, `qn`, `cancer`, `gemini`; điểm/cạnh được khai báo trong `content/universe.json` và snapshot `static/memories.js`.
- `static/universe/constellations.js` đã có pointer events, bàn phím, undo/reset, thông báo live region và lưu tiến độ theo phiên bản mẫu.
- Catalog ảnh được sinh từ `image_catalog.py`; mỗi ảnh có ID ổn định, thumbnail, file gốc, alt text, caption tùy chọn và ngày tùy chọn.
- Modal đang có focus trap, `Escape`, `inert`, chế độ reduced motion và đường xem ảnh dự phòng. Mini game phải dùng cùng cơ chế này.

## 3. Mục tiêu trải nghiệm chung

- Người chơi luôn biết đang ở game nào, cấp độ nào, ảnh nào và cách thoát.
- Một thời điểm chỉ có một tương tác chính: khi đang chơi game thì camera, sao băng và nút nền không nhận thao tác.
- Mọi thao tác quan trọng dùng được bằng chạm, chuột và bàn phím; vùng chạm tối thiểu 44 × 44 CSS px.
- Không để một ảnh lỗi hoặc WebGL lỗi làm kẹt cả trang. Puzzle là giao diện DOM/CSS và có thể chạy khi cảnh 3D không khả dụng.
- Các thông báo như hoàn thành, thời gian, kỷ lục dùng text an toàn và `aria-live`, không chèn HTML từ metadata ảnh.

## 4. Luồng vào game và trạng thái

Thêm nút **Mini game** hoặc **Xếp hình ký ức** vào action bar. Trong panel mini game có hai lựa chọn:

- **Nối chòm sao**: mở panel hiện tại, bổ sung bộ lọc độ khó.
- **Xếp hình ký ức**: mở màn hình thiết lập puzzle.

Để không làm action bar quá chật trên điện thoại, có thể dùng một nút `Mini game` mở modal danh sách; desktop có thể hiển thị thêm nút tắt nếu còn chỗ.

Các mode mới:

```text
EXPLORE
 ├─ CONSTELLATION_DRAW
 ├─ SLIDING_SETUP
 ├─ SLIDING_PLAY
 ├─ SLIDING_PAUSED
 └─ SLIDING_COMPLETE
```

`U.modal` vẫn quản lý focus và trả focus về nút mở game. Khi rời `SLIDING_PLAY`, phải hủy timer, listener `visibilitychange`, pointer capture và object URL/canvas tạm.

## 5. Nối chòm sao: thêm độ khó

### 5.1. Mô hình dữ liệu

Giữ `points`, `edges`, `message`, `version` để không phá các mẫu hiện tại; bổ sung `difficulty` và metadata luật chơi:

```json
{
  "id": "heart-medium",
  "difficulty": "medium",
  "version": 1,
  "title": "Trái tim · Trung bình",
  "message": "...",
  "points": [[0.5, 0.2], [0.3, 0.3]],
  "edges": [[0, 1]],
  "rules": {
    "showGuides": "selected",
    "hintLimit": 3,
    "pointRadius": 24,
    "decoyPoints": 0
  }
}
```

Tách cấu hình cấp độ khỏi từng hình để chỉnh đồng nhất:

```json
{
  "id": "very-hard",
  "label": "Rất khó",
  "description": "Nhiều nhánh, ít gợi ý",
  "defaultHintLimit": 1
}
```

Mẫu cũ được gán `difficulty: "easy"` và giữ nguyên khóa tiến độ `constellation:<id>:<version>`. Mẫu mới dùng ID riêng, không ghi đè tiến độ cũ.

### 5.2. Quy ước bốn mức

| Mức | Nội dung đề xuất | Gợi ý/đường dẫn | Dung sai và luật |
|---|---|---|---|
| Dễ | Các mẫu hiện tại; khoảng 5–21 điểm, cạnh rõ | Hiện đường hướng dẫn, gợi ý cạnh kế tiếp | Bán kính bắt điểm 26–30 px; không có sao mồi |
| Trung bình | Hình mới 12–18 điểm, có 1–2 nhánh | Đường hướng dẫn mờ; hiện cạnh liên quan khi chọn điểm; tối đa 3 gợi ý | Bán kính 24 px; nối sai chỉ kết thúc nét hiện tại |
| Khó | 20–32 điểm, nhiều nhánh hoặc nhiều nét độc lập | Ẩn đường hướng dẫn cho tới khi chọn điểm; tối đa 1 gợi ý | Bán kính 21–22 px; không tự nối qua điểm trung gian |
| Rất khó | 30–45 điểm, bố cục dày và nhiều nét độc lập | Không hiện sẵn đường hướng dẫn; có thể xin 1 gợi ý trợ năng | Bán kính 19–20 px; phải hoàn thành đủ cạnh, không dùng sao mồi ở bản đầu |

Độ khó nên đến từ cấu trúc hình và lượng thông tin hiển thị, không đến từ việc làm điểm quá nhỏ trên điện thoại. Khi thử nghiệm thấy một mẫu không thể giải bằng chạm hoặc bàn phím, hạ mật độ điểm hoặc tăng bán kính riêng cho mobile.

### 5.3. UI và hành vi

- Chọn **mức độ khó** trước, sau đó chọn hình trong mức đó. Hiển thị số điểm, số nét và giới hạn gợi ý trước khi bắt đầu.
- Giữ các nút **Lùi một nét**, **Nét mới**, **Vẽ lại**. Thêm **Gợi ý** khi cấp độ cho phép; mỗi lần gợi ý được ghi vào live region và trừ bộ đếm gợi ý.
- Progress hiển thị đồng thời `đã nối / tổng số nét` và tên cấp độ.
- Không thêm đồng hồ vào Nối sao trong bản này vì yêu cầu không nêu tính giờ; tránh biến trải nghiệm lãng mạn thành cuộc đua.
- Khi hoàn thành: phát sáng hình, hiện thông điệp mẫu, cấp độ và nút “Chơi hình khác”.

### 5.4. Thuật toán và lưu tiến độ

- `edges` được chuẩn hóa bằng khóa không phụ thuộc chiều (`min-max`), chống đếm lặp như engine hiện tại.
- Khi đổi cấp độ hoặc mẫu, lọc dữ liệu localStorage theo `id + version`; dữ liệu cũ không được áp vào hình mới.
- `hintLimit`, `showGuides`, `pointRadius` đọc từ metadata; không rải điều kiện cấp độ trong pointer handler.
- Vẫn dùng Pointer Events + pointer capture; xử lý `pointercancel`, `blur`, đổi hướng màn hình và đa chạm.
- Hoàn thành lưu ở localStorage theo khóa phiên bản. Đây là tiến độ giao diện trên thiết bị, không phải cơ chế bảo mật.

## 6. Sliding Picture Puzzle

### 6.1. Luồng người dùng

1. Chọn **Xếp hình ký ức**.
2. Ở màn hình thiết lập:
   - chọn ảnh từ lưới thumbnail hoặc chọn **Ảnh ngẫu nhiên**;
   - chọn cấp độ;
   - chọn **Hiện hình mẫu** hoặc **Ẩn hình mẫu**. Mặc định: hiện ở Dễ/Trung bình, ẩn ở Khó/Rất khó nhưng người chơi được đổi;
   - bấm **Bắt đầu**.
3. Bàn chơi hiển thị ảnh đã xáo trộn, một ô trống, đồng hồ, số nước đi, nút hình mẫu, tạm dừng, chơi lại và thoát.
4. Khi hoàn thành, hiện thời gian, số nước, ảnh đã dùng, kỷ lục ảnh này và kỷ lục nhanh nhất của cấp độ.

Hình mẫu là một panel/cửa sổ con có thể mở hoặc đóng trong lúc chơi. Mở hình mẫu không làm xáo trộn bàn và không reset timer.

### 6.2. Bốn cấp độ đề xuất

| Mức | Kích thước | Số mảnh | Số bước xáo trộn khởi điểm | Mặc định hình mẫu |
|---|---:|---:|---:|---|
| Dễ | 3 × 3 | 8 + ô trống | 60–80 bước hợp lệ | Hiện |
| Trung bình | 4 × 4 | 15 + ô trống | 120–160 bước | Hiện |
| Khó | 5 × 5 | 24 + ô trống | 220–280 bước | Ẩn |
| Rất khó | 6 × 6 | 35 + ô trống | 350–450 bước | Ẩn |

Các con số là điểm khởi đầu để playtest, không phải cam kết độ khó. Nếu bước xáo trộn ngẫu nhiên quay về trạng thái quá dễ, thực hiện lại với seed khác; luôn bảo đảm trạng thái cuối có thể giải.

### 6.3. Nguồn ảnh và cách dựng mảnh

- Nguồn lựa chọn là `Universe.config.memories`, không tạo catalog thứ hai. ID ảnh là ID ổn định hiện có.
- Dùng thumbnail đã tạo bởi `scripts/build_thumbnails.py`; nếu thumbnail lỗi thì thử file ảnh gốc. Chỉ decode ảnh được chọn, không tải toàn bộ 65 ảnh.
- Để ảnh dọc/ngang không làm mảnh lệch nhau, chuẩn hóa ảnh vào canvas chữ nhật theo đúng tỉ lệ gốc trước khi dựng bàn. Các mảnh có thể là hình chữ nhật; không kéo giãn ảnh và không crop phần nội dung chính.
- Có thể triển khai mảnh bằng một ảnh nền CSS cho mỗi ô (`background-size` theo lưới, `background-position` theo tọa độ) hoặc canvas đã chuẩn hóa. Ưu tiên CSS/DOM để bàn phím, focus và screen reader dễ kiểm thử; canvas chỉ dùng cho bước chuẩn hóa ảnh.
- Mảnh trống không được hiển thị nội dung, nhưng có nhãn `Ô trống` cho trợ năng.

### 6.4. Luật xáo trộn và thao tác

- Trạng thái chuẩn là mảng số `0..N-1`, trong đó `N-1` là ô trống.
- Xáo trộn bằng các bước trượt hợp lệ bắt đầu từ trạng thái đã giải, cấm đảo ngược ngay bước trước và kiểm tra không kết thúc ở trạng thái chuẩn.
- Click/tap vào mảnh cạnh ô trống để trượt; click mảnh không hợp lệ chỉ phát phản hồi nhẹ và không tăng số nước.
- Bàn phím: mũi tên hoặc WASD điều khiển ô cạnh ô trống; focus luôn ở bàn chơi hoặc mảnh vừa di chuyển. Kéo mảnh là tùy chọn bổ sung, không phải đường thao tác duy nhất.
- Chỉ nước đi hợp lệ tăng `moves`. Undo không có trong bản đầu vì làm thay đổi ý nghĩa của kỷ lục; có **Chơi lại** để tạo ván mới.
- Reduced motion tắt animation trượt; logic và timer giữ nguyên.

### 6.5. Đồng hồ và tạm dừng

- Timer bắt đầu tại nước đi hợp lệ đầu tiên, không bắt đầu khi người dùng đang chọn ảnh.
- Dùng `performance.now()` và cộng các khoảng thời gian đang chạy; không dùng đồng hồ hệ thống để tránh thay đổi giờ làm sai phiên chơi.
- Khi tab bị ẩn, tự chuyển sang `SLIDING_PAUSED`; hiển thị lớp “Đã tạm dừng vì tab không hiển thị”. Người chơi bấm tiếp tục để chạy lại.
- Nút **Tạm dừng** dừng timer và khóa bàn. Khi hoàn thành, timer dừng vĩnh viễn và ghi `elapsedMs`.
- Hiển thị `mm:ss.t` trong lúc chơi; lưu số mili-giây để so sánh chính xác.

### 6.6. Kỷ lục và localStorage

Lưu schema có phiên bản để sau này đổi luật không làm hỏng dữ liệu:

```json
{
  "schema": 1,
  "records": {
    "easy": {
      "m-abc123": {"elapsedMs": 48200, "moves": 91, "createdAt": "2026-09-23T..."}
    }
  },
  "globalBest": {
    "easy": {"memoryId": "m-abc123", "elapsedMs": 48200, "moves": 91}
  }
}
```

- Khóa đề xuất: `love:v2:sliding-puzzle:records:v1`.
- Mỗi ảnh/cấp độ có kỷ lục riêng; đồng thời lưu fastest record của cấp độ để người chơi thấy tiến bộ ngay cả khi đổi ảnh.
- So sánh theo `elapsedMs`, hòa thì ưu tiên ít nước hơn. Chỉ ghi sau khi bàn ở trạng thái giải.
- Lưu ID ảnh, không lưu data URL hoặc bản sao ảnh lớn.
- Nếu localStorage bị chặn hoặc dữ liệu hỏng, game vẫn chơi được trong phiên hiện tại và thông báo ngắn rằng kỷ lục chưa lưu được.
- Khi mở phiên bản schema mới, đọc schema cũ nếu tương thích; nếu không, bỏ qua có kiểm soát và không làm hỏng catalog.

## 7. Kiến trúc và file dự kiến

### Frontend

- `templates/index.html`: thêm nút Mini game, panel chọn game, panel thiết lập/chơi/hoàn thành puzzle; thêm các script theo thứ tự `core → constellations → sliding-puzzle → app`.
- `static/universe/constellations.js`: tách chọn cấp độ khỏi chọn mẫu, đọc `rules`, gợi ý có giới hạn và render trạng thái cấp độ.
- `static/universe/sliding-puzzle.js`: module độc lập với `init`, `open`, `start`, `pause`, `resume`, `move`, `finish`, `dispose`.
- `static/app.js`: đăng ký nút mở game, khởi tạo module, áp dụng feature flag và khôi phục focus.
- `static/universe/core.js`: nếu cần, thêm helper đọc/ghi localStorage có schema và helper chọn memory hợp lệ.
- `static/universe.css`: style cho setup, board, tile, timer, reference panel, completion card và mobile/reduced motion.

### Dữ liệu và build

- `content/universe.json`: thêm `features.slidingPuzzle`, cấu hình cấp độ, metadata difficulty cho chòm sao và mẫu chòm sao mới.
- Chạy `python scripts/build_thumbnails.py` sau khi thêm/thay ảnh; không sửa tay `static/memories.js`.
- `image_catalog.py` giữ nguyên cách tạo ID; game không dùng tên file làm khóa.
- Flask không cần route mới cho bản đầu. `/api/universe` vẫn trả catalog công khai như hiện tại để phiên HTTP và snapshot static dùng cùng dữ liệu.

### Không đổi

- Không thêm React, game engine mới hoặc pipeline build nặng.
- Không đưa kỷ lục vào SQLite khi chưa có yêu cầu đồng bộ nhiều thiết bị.
- Không lưu ảnh người dùng trong localStorage.

## 8. Kiểm thử và nghiệm thu

### Unit/logic

Tạo test cho module puzzle hoặc tách các hàm thuần để kiểm tra:

- mọi trạng thái sinh ra từ shuffle đều giải được;
- shuffle không trả trạng thái hoàn chỉnh và không đi ngược liên tiếp;
- move hợp lệ/không hợp lệ, ô trống, phát hiện hoàn thành;
- timer chỉ bắt đầu sau nước đầu, pause/resume không cộng thời gian ẩn tab;
- tie-break theo số nước;
- ghi/đọc/migrate record và xử lý JSON hỏng;
- random image chỉ chọn ID có trong catalog và có thumbnail/file hợp lệ;
- constellation rules không làm thay đổi các mẫu cũ.

### Browser E2E

Mở rộng `tests/universe_v2.cjs` hoặc thêm `tests/minigames.cjs` với desktop, mobile và reduced motion:

1. Mở Mini game → chọn Nối chòm sao → kiểm tra đủ bốn mức.
2. Chơi một mẫu trung bình/khó bằng click và một mẫu bằng bàn phím; reload kiểm tra tiến độ.
3. Mở puzzle → chọn ảnh cố định → bật/tắt hình mẫu → kiểm tra tile, ô trống, timer và số nước.
4. Dùng fixture/seed để đưa bàn về gần trạng thái giải, hoàn thành mà không phải chờ shuffle ngẫu nhiên; kiểm tra record xuất hiện.
5. Reload, chọn lại cùng ảnh/cấp độ và thấy kỷ lục; chọn ảnh ngẫu nhiên và xác nhận ID thuộc catalog.
6. Ẩn tab, tạm dừng, Escape/Back, xoay viewport, ảnh lỗi, localStorage hỏng và WebGL bị chặn.
7. Kiểm tra không có scroll ngang, không có page error, modal trả focus đúng và `aria-live` có thông báo hoàn thành.

### Hiệu năng

- Không decode toàn bộ kho ảnh khi mở trang hoặc khi mở màn hình setup.
- Bàn 6 × 6 giữ số node ổn định; không tạo DOM mới cho mỗi frame.
- Sau 20 lượt bắt đầu/thoát puzzle, không tăng listener, canvas hoặc object URL.
- Trên mobile 390 × 844, tile vẫn thao tác được và timer không làm giật board.

### Tiêu chí chấp nhận

- Người dùng chọn được Dễ/Trung bình/Khó/Rất khó cho Nối sao; mẫu cũ vẫn hoàn thành như trước.
- Người dùng chọn hoặc random ảnh từ kho, chọn một trong bốn cấp puzzle, bật/tắt hình mẫu và hoàn thành bằng chạm/chuột/bàn phím.
- Timer, số nước, pause khi tab ẩn và kỷ lục sau khi hoàn thành hoạt động đúng.
- Kỷ lục còn sau reload cùng thiết bị; dữ liệu lỗi không làm game hoặc kho ảnh hỏng.
- Ảnh gốc không bị sửa, thư tương lai/điều ước không bị ảnh hưởng, và toàn bộ test 2.0 hiện tại vẫn chạy.

## 9. Lộ trình triển khai đề xuất

| Mốc | Công việc | Đầu ra | Ước lượng |
|---|---|---|---:|
| MG0 | Chốt tên cấp độ, mẫu chòm sao, crop ảnh, copy, thiết bị mục tiêu | Spec và danh sách level được duyệt | 1–2 ngày |
| MG1 | Feature flag, schema, shared game shell, modal/focus/lifecycle | Có thể bật/tắt game độc lập | 1–2 ngày |
| MG2 | Refactor Nối sao và làm nội dung 3 cấp mới | Bốn mức chơi được, lưu tiến độ | 2–3 ngày |
| MG3 | Engine Sliding Puzzle, shuffle solvable, render tile, input | Bàn 3×3 đến 6×6 chạy local | 2–3 ngày |
| MG4 | Chọn/random ảnh, hình mẫu, timer, pause, record | Luồng puzzle hoàn chỉnh | 2–3 ngày |
| MG5 | Accessibility, mobile/reduced motion, lỗi ảnh/localStorage, tuning | UI sẵn sàng nghiệm thu | 1–2 ngày |
| MG6 | E2E, hồi quy Big Update 2.0, thiết bị thật, backup/rollback | Checklist phát hành và build cuối | 2–3 ngày |

Tổng khoảng **11–15 ngày công**, đã bao gồm phần kiểm thử ban đầu; nên giữ thêm 20–25% dự phòng cho việc vẽ mẫu chòm sao, cân chỉnh độ khó và test thiết bị thật. Trong lịch Big Update 2.0, đặt MG2 sau nền M1/M4 hiện tại và đặt MG3–MG6 trước cổng nghiệm thu phát hành M7.

Mỗi mốc nên là một PR nhỏ, có feature flag để tắt riêng mini game khi phát hành. Không bật puzzle cho người dùng trước khi test xáo trộn, timer và localStorage hoàn tất.

## 10. Quyết định cần chốt trước khi code

1. Tên hiển thị cuối cùng: **Mini game**, **Trạm ký ức**, hay **Xếp hình ký ức**.
2. Bản đầu có bao nhiêu mẫu chòm sao cho mỗi mức; đề xuất tối thiểu 1 mẫu mới cho Trung bình, Khó, Rất khó và bổ sung dần sau.
3. Có cho phép mở hình mẫu trong lúc chơi và việc đó có tách kỷ lục hay không; đề xuất cho phép và chỉ lưu trạng thái hỗ trợ, vì đây là kỷ lục cá nhân chứ không phải bảng thi đấu.
4. Kỷ lục chỉ trên thiết bị hay cần đồng bộ. Đề xuất chốt localStorage cho 2.0; API đồng bộ để phiên sau.
5. Đã chốt ưu tiên khung chữ nhật theo tỉ lệ ảnh; chỉ dùng crop vuông làm fallback khi trình duyệt không thể xử lý canvas.
6. Có muốn thêm âm thanh click/hoàn thành hay giữ nhạc nền hiện tại; mặc định giữ nhạc và thêm âm thanh là tùy chọn, tôn trọng reduced motion/âm thanh.
