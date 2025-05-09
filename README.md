**Báo Cáo Phát Triển Hệ Thống Tính Elo Mô Phỏng**

**I. Giai Đoạn Khởi Đầu: Ý Tưởng và Mục Tiêu Cơ Bản (Console Application)**

1.  **Yêu Cầu Ban Đầu:**
    *   Xây dựng hệ thống tính Elo cho 100 người chơi qua 100 trận đấu gần nhất của mỗi người.
    *   Tự nghiên cứu điều kiện cộng/trừ điểm và hệ số.
    *   Có khả năng random kết quả trận đấu cho một số người chơi.
    *   Thiết kế UI (ban đầu là console, sau đó là web).
    *   Ngôn ngữ: Node.js/JavaScript.

2.  **Thiết Kế Elo Cốt Lõi Ban Đầu (Trước PBR):**
    *   **Công thức Elo Chuẩn:** `R_new = R_old + K * (S - E)`
        *   `R_old`: Elo hiện tại.
        *   `K (K-Factor)`: Hệ số quyết định mức độ thay đổi Elo. Ban đầu được đề xuất là **K-Factor động**, thay đổi dựa trên số trận đã chơi (`gamesPlayed`) và/hoặc Elo hiện tại của người chơi.
            *   Người chơi mới (<30 trận): K cao (ví dụ 40).
            *   Người chơi Elo cao (>2200-2400): K thấp (ví dụ 10).
            *   Người chơi thường: K trung bình (ví dụ 20).
        *   `S (Actual Score)`: 1 cho thắng, 0 cho thua.
        *   `E (Expected Score)`: `1 / (1 + 10^((Elo_trung_bình_đội_địch - Elo_trung_bình_đội_mình) / 400))`.
    *   **Mô Phỏng Trận Đấu (5v5):**
        *   Chọn 10 người chơi ngẫu nhiên.
        *   Chia 2 đội ngẫu nhiên.
        *   Xác định đội thắng: Ban đầu là random 50/50, sau đó cải tiến để đội có Elo trung bình cao hơn có tỷ lệ thắng cao hơn một chút.
    *   **Lưu Trữ Dữ Liệu (Ban đầu là trong bộ nhớ, sau đó chuyển sang MongoDB):**
        *   Thông tin người chơi: `playerId`, `playerName`, `elo`, `gamesPlayed`, `matchHistory` (mảng 100 trận gần nhất).
        *   `matchHistory` mỗi trận: `matchId`, `opponentTeamAvgElo`, `myTeamAvgElo`, `result`, `eloChange`, `timestamp`.
    *   **Yêu Cầu "Random Kết Quả":** Triển khai bằng cách sau một số trận, chọn ngẫu nhiên vài người chơi và cộng/trừ một lượng Elo nhỏ, độc lập với kết quả trận họ vừa chơi (nếu có).

**II. Giai Đoạn Chuyển Đổi và Mở Rộng: Tích Hợp MongoDB và Xây Dựng API**

1.  **Lựa Chọn Database:** Quyết định sử dụng **MongoDB** để lưu trữ dữ liệu bền vững, phù hợp với cấu trúc dữ liệu dạng JSON của JavaScript và mục tiêu học tập dài hạn.
2.  **Tái Cấu Trúc Code:**
    *   Tách logic kết nối DB (`db/mongo.js`).
    *   Tách logic nghiệp vụ ra các `services` (`playerService.js`, `matchService.js`, `eloService.js`).
    *   Tạo `controllers` để xử lý request API (`playerController.js`, `simulationController.js`).
    *   Xây dựng server Express.js (`server.js`) để cung cấp các API endpoint.
3.  **API Endpoints Được Triển Khai:**
    *   Quản lý người chơi: `GET /players`, `GET /players/:playerId`, `POST /players/initialize`.
    *   Mô phỏng: `POST /simulate/match`, `POST /randomize-event`.
4.  **Cải Tiến Lưu Trữ Lịch Sử Đấu:**
    *   **Thảo luận:** Nhận thấy việc truy vấn thông tin đầy đủ của một trận đấu (cả 10 người chơi) từ `players.matchHistory` là không hiệu quả.
    *   **Giải pháp:** Tạo thêm collection **`matches`**. Mỗi document lưu thông tin chi tiết của một trận đấu, bao gồm `matchId`, `winningTeam`, và danh sách người chơi của cả hai đội cùng với Elo trước/sau, `eloChange`, và các chỉ số hiệu suất.
    *   `players.matchHistory` vẫn lưu trữ thông tin tóm tắt và chi tiết cá nhân của người chơi đó trong trận để hiển thị lịch sử cá nhân nhanh chóng.
    *   Thêm API để truy vấn `matches` collection: `GET /matches/:matchId`, `GET /matches?playerId=...`.

**III. Giai Đoạn Nâng Cao: Tích Hợp Performance-Based Rating (PBR) và Các Yếu Tố "Thật" Hơn**

Đây là giai đoạn chúng ta đang tập trung và đã có nhiều thay đổi quan trọng trong **cơ chế tính Elo**.

1.  **Yêu Cầu Mới:**
    *   Elo khởi điểm của người chơi là `0`.
    *   Tính Elo dựa trên hiệu suất cá nhân (PBR).
    *   Lưu trữ thêm thông tin: Tướng đã chơi, vai trò.
    *   Tạo danh sách tướng giả lập (~50 tướng), lưu vào MongoDB (collection `champions`).

2.  **Thay Đổi Cách Tính Elo (Tập trung vào `eloService.calculateEloDelta`):**
    *   **Đầu vào mới cho hàm tính Elo:** Ngoài các yếu tố cũ, hàm `calculateEloDelta` giờ đây nhận thêm:
        *   `playerRole`: Vai trò người chơi đảm nhận (Top, Mid, Jungle, ADC, Support).
        *   `playerKDA`: Đối tượng `{ kills, deaths, assists }`.
        *   `playerCS`: Tổng số lính.
        *   `playerGold`: Tổng số vàng.
        *   (`avgMatchElo` cũng được truyền vào để có thể dùng cho việc điều chỉnh benchmark PBR nâng cao sau này).
    *   **Bước 1: Tính `baseEloChange`:** Vẫn dựa trên công thức Elo chuẩn (Win/Loss, chênh lệch Elo đội, K-Factor).
    *   **Bước 2: Tính `pbrAdjustment`:**
        *   **Định nghĩa Benchmark:** Trong `config/constants.js`, tạo `PBR_BENCHMARKS` cho mỗi vai trò, bao gồm `kdaRatio`, `csPerMin`, `goldPerMin` kỳ vọng (giả định `AVERAGE_MATCH_DURATION_MINUTES` để quy đổi).
        *   **So sánh hiệu suất:** Tính `playerKdaRatio`, `playerCsPerMin`, `playerGoldPerMin` từ dữ liệu thực tế của người chơi.
        *   **Tính `performanceScore`:** Một điểm số tổng hợp dựa trên mức độ chênh lệch của các chỉ số cá nhân so với benchmark của vai trò. Mỗi chỉ số (KDA, CS, Gold) có một trọng số nhất định.
        *   **Quy đổi `performanceScore` thành `pbrAdjustment` (điểm Elo):**
            *   `performanceScore` dương (chơi tốt hơn benchmark) -> `pbrAdjustment` dương.
            *   `performanceScore` âm (chơi tệ hơn benchmark) -> `pbrAdjustment` âm.
            *   `pbrAdjustment` được giới hạn bởi `MAX_PBR_POSITIVE_ADJUSTMENT` và `MAX_PBR_NEGATIVE_ADJUSTMENT` (ví dụ: +/- 5 Elo) để không làm lu mờ `baseEloChange`.
            *   Có thêm logic tinh chỉnh nhỏ: thắng mà chơi quá tệ có thể bị giảm PBR bonus, thua mà chơi quá hay có thể được giảm PBR malus.
    *   **Bước 3: Tính `finalEloChange = baseEloChange + pbrAdjustment`.**

3.  **Cải Tiến Yếu Tố Chuỗi Thắng/Thua (Streaks):**
    *   **Theo dõi:** Thêm `currentWinStreak` và `currentLossStreak` vào `players` document.
    *   **Áp dụng:** Trong `matchService.updatePlayerAfterMatch`, sau khi có `finalEloChange` (đã bao gồm PBR):
        *   Cập nhật streak của người chơi.
        *   Dựa trên độ dài chuỗi thắng/thua mới, cộng thêm một `streakAdjustment` (bonus/malus Elo nhỏ, ví dụ +/- 1 đến 3 Elo) vào `finalEloChange`.
        *   Các ngưỡng và điểm thưởng/phạt được định nghĩa trong `STREAK_THRESHOLDS`.

4.  **Đảm Bảo Elo Tối Thiểu là 0:**
    *   Trong `matchService.updatePlayerAfterMatch`, sau khi đã có `finalEloChange` (bao gồm PBR và streak), nếu `newElo` (Elo mới sau khi cộng `finalEloChange`) < 0, thì `newElo` được đặt thành 0.
    *   `eloChange` được ghi vào `matchHistory` cũng được điều chỉnh để phản ánh đúng lượng điểm bị trừ thực tế nếu Elo chạm sàn 0.

5.  **Cải Tiến Hệ Thống Giả Lập Trận Đấu (`matchService.simulateNewMatch`):**
    *   **Mô Phỏng Chỉ Số Hiệu Suất (`generatePerformanceStats`):**
        *   Ban đầu đơn giản, chỉ dựa vào vai trò và kết quả thắng/thua.
        *   **Cải tiến đáng kể:** Hàm này được làm "thông minh" hơn bằng cách xem xét:
            *   Chênh lệch Elo cá nhân của người chơi so với Elo trung bình trận (`skillFactor`).
            *   Chênh lệch Elo trung bình giữa hai đội (`teamPerformanceFactor`).
            *   Điều chỉnh KDA, CS, Gold dựa trên các factor này để người chơi Elo cao có xu hướng "dominate" khi thắng, hoặc KDA vẫn ổn dù thua nếu chênh lệch kỹ năng lớn.
    *   **Gán Vai Trò và Chọn Tướng "Thật" Hơn:**
        *   Người chơi có `preferredRoles` (mảng vai trò yêu thích) và `championPool` (mảng tướng hay chơi) trong document của mình (được gán ngẫu nhiên khi khởi tạo).
        *   Hàm `assignRolesAndChampions` mới được tạo để:
            *   Cố gắng gán vai trò cho người chơi dựa trên `preferredRoles` của họ, đảm bảo mỗi đội có đủ 5 vị trí.
            *   Sau khi có vai trò, chọn tướng ưu tiên từ `championPool` của người chơi nếu tướng đó phù hợp với vai trò.
            *   Có fallback về việc gán/chọn ngẫu nhiên nếu logic "thông minh" không tìm được giải pháp.
        *   Điều này thay thế việc gán vai trò và chọn tướng hoàn toàn ngẫu nhiên trước đây.

**Tóm Tắt Cách Tính Elo Hiện Tại (Sau Tất Cả Các Cải Tiến):**

1.  **Elo Khởi Điểm:** 0.
2.  **Trong một trận đấu, với mỗi người chơi:**
    a.  **Tính `baseEloChange`:** Dựa trên Elo hiện tại, K-Factor động, kết quả thắng/thua, và chênh lệch Elo trung bình giữa hai đội.
    b.  **Tính `pbrAdjustment`:** Dựa trên so sánh KDA, CS, Gold thực tế (được mô phỏng bởi `generatePerformanceStats` đã cải tiến) của người chơi với benchmark của vai trò mà họ đảm nhận (đã được gán "thông minh" hơn).
    c.  `eloDeltaWithPbr = baseEloChange + pbrAdjustment`.
    d.  **Tính `streakAdjustment`:** Dựa trên chuỗi thắng/thua hiện tại của người chơi.
    e.  `finalEloDelta = eloDeltaWithPbr + streakAdjustment`.
    f.  `newElo = player.elo + finalEloDelta`.
    g.  Nếu `newElo < 0`, thì `newElo = 0`. `eloChange` ghi vào lịch sử được điều chỉnh tương ứng.
    h.  Cập nhật Elo, `gamesPlayed`, chuỗi thắng/thua cho người chơi.
    i.  Lưu chi tiết trận đấu (bao gồm vai trò, tướng, KDA, CS, Gold, eloChange) vào `players.matchHistory` và `matches` collection.

**Trọng Tâm Tiếp Theo (và đã bắt đầu hình thành):**

*   **Hiển thị đánh giá hiệu suất (S, A, B, C, D, MVP):** Đây là "sản phẩm phụ" của logic PBR. Chúng ta cần định nghĩa các ngưỡng `performanceScore` để quy ra các hạng này.
*   **Hệ thống Rank (Đồng, Bạc, Vàng...):** Ánh xạ từ điểm Elo của người chơi.
*   **Cải thiện Matchmaking trong `simulateNewMatch`:** Để các trận đấu mô phỏng có tính "cân kèo" hơn, ưu tiên người chơi có Elo gần nhau.
*   **Tinh chỉnh liên tục:** `PBR_BENCHMARKS`, trọng số PBR, logic `generatePerformanceStats`, điểm bonus/malus của streak – tất cả đều cần được quan sát và tinh chỉnh để hệ thống hoạt động một cách cân bằng và hợp lý nhất.

