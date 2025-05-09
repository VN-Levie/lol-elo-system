
**Báo Cáo Tiến Độ và Dòng Chảy Phát Triển Hệ Thống Mô Phỏng Elo**

**I. Giai Đoạn 1: Hình Thành Ý Tưởng và Nền Tảng Cơ Bản (Console)**

1.  **Mục tiêu ban đầu:** Xây dựng hệ thống tính Elo cho 100 người chơi, 100 trận gần nhất, có yếu tố ngẫu nhiên và UI (console).
2.  **Tính Elo (Phiên bản 1.0 - Rất cơ bản):**
    *   Công thức: `R_new = R_old + K * (S - E)`.
    *   `K-Factor`: Động, dựa trên số trận đã chơi và Elo hiện tại (ví dụ: mới chơi K=40, Elo cao K=10, thường K=20).
    *   `S`: 1 cho thắng, 0 cho thua.
    *   `E`: Dựa trên chênh lệch Elo trung bình 2 đội.
    *   Elo khởi điểm: Mặc định 1200.
3.  **Mô Phỏng Trận Đấu (Phiên bản 1.0):**
    *   Chọn 10 người chơi hoàn toàn ngẫu nhiên.
    *   Chia 2 đội ngẫu nhiên.
    *   Kết quả trận: Random 50/50, sau đó cải tiến nhẹ để đội Elo cao hơn có tỷ lệ thắng cao hơn một chút.
    *   **Không có vai trò, không có tướng, không có chỉ số hiệu suất cá nhân (KDA, CS, Gold).**
4.  **Lưu trữ:** Ban đầu là mảng trong bộ nhớ, sau đó nhanh chóng xác định cần database.
5.  **Yếu tố ngẫu nhiên ("Random Event"):** Cộng/trừ Elo ngẫu nhiên cho một vài người chơi.

**II. Giai Đoạn 2: Chuyển Sang Backend API và Lưu Trữ Bền Vững (MongoDB)**

1.  **Lựa chọn Database:** **MongoDB** được chọn để lưu trữ dữ liệu người chơi (`players` collection) và sau này là tướng, trận đấu.
2.  **Xây dựng API (Express.js):**
    *   Tái cấu trúc code thành `services`, `controllers`.
    *   Các API cơ bản: lấy danh sách người chơi, chi tiết người chơi, khởi tạo, mô phỏng trận, kích hoạt random event.
3.  **Tính Elo (Phiên bản 2.0 - Vẫn là cơ bản, nhưng chạy qua API):**
    *   Logic tính Elo cốt lõi (trong `eloService.js`) không thay đổi so với Giai đoạn 1. Chỉ là cách gọi và cập nhật dữ liệu vào MongoDB.
4.  **Mô Phỏng Trận Đấu (Phiên bản 2.0 - Qua API):**
    *   Logic mô phỏng vẫn tương tự Giai đoạn 1, chỉ là dữ liệu được đọc/ghi từ MongoDB.
    *   **Vẫn chưa có vai trò, tướng, hay chỉ số hiệu suất cá nhân được mô phỏng chi tiết.**
5.  **Mở rộng Lưu Trữ - Collection `matches`:**
    *   **Nhận thấy:** Khó khăn khi muốn xem lại chi tiết một trận đấu (cả 10 người) nếu chỉ dựa vào `players.matchHistory`.
    *   **Giải pháp:** Tạo collection `matches` để lưu thông tin toàn diện của từng trận đấu (ID trận, đội thắng, danh sách người chơi mỗi đội cùng Elo trước/sau, `eloChange`). `players.matchHistory` vẫn lưu tóm tắt và chi tiết của cá nhân người đó.
    *   Thêm API để truy vấn `matches`.

**III. Giai Đoạn 3: Nâng Cao Hệ Thống - PBR, Chi Tiết Hóa Mô Phỏng (Trọng Tâm Hiện Tại)**

Đây là giai đoạn có sự thay đổi lớn nhất và phức tạp nhất, đặc biệt là về **cách tính Elo** và **chất lượng mô phỏng trận đấu.**

1.  **Yêu Cầu Nâng Cao:**
    *   Elo khởi điểm = `0`.
    *   **Performance-Based Rating (PBR):** Elo phải phản ánh hiệu suất cá nhân.
    *   Mô phỏng tướng, vai trò, và các chỉ số KDA, CS, Gold.
    *   Hệ thống chuỗi thắng/thua.
    *   Mô phỏng matchmaking "thật" hơn.

2.  **Thay Đổi Lớn trong Mô Phỏng Trận Đấu (`matchService.simulateNewMatch`):**
    *   **Hệ thống Tướng:**
        *   Tạo collection `champions` trong MongoDB (~50 tướng giả lập).
        *   Người chơi có `championPool` (danh sách tướng hay chơi).
    *   **Hệ thống Vai Trò:**
        *   Người chơi có `preferredRoles` (vai trò yêu thích).
    *   **Cải thiện Matchmaking (Phiên bản 3.0 -> 3.1):**
        *   **Ban đầu (3.0):** Vẫn chọn 10 người ngẫu nhiên, sau đó cố gắng gán vai trò dựa trên `preferredRoles` và chọn tướng từ `championPool` (nếu phù hợp vai trò).
        *   **Cải tiến (3.1 - Hiện tại):**
            *   **Tìm kiếm dựa trên Elo:** Chọn "seed player", tìm kiếm người chơi khác trong một khoảng Elo (`searchRange`), mở rộng nếu cần.
            *   **Cân bằng đội (`findBalancedTeams`):** Sau khi có 10 người, thử các cách chia đội để tìm ra cặp đội có chênh lệch Elo trung bình thấp nhất.
            *   **Gán vai trò và chọn tướng cho đội đã cân bằng (`assignRolesToTeam`):** Logic ưu tiên `preferredRoles` và `championPool` được áp dụng cho từng đội.
    *   **Mô Phỏng Chỉ Số Hiệu Suất (`generatePerformanceStats` - Phiên bản 2.0 -> 3.0):**
        *   **Ban đầu (2.0):** Rất đơn giản, random dựa trên vai trò và thắng/thua.
        *   **Cải tiến (3.0 - Hiện tại):** "Thông minh" hơn nhiều:
            *   Tính `skillFactor` (dựa trên chênh lệch Elo người chơi so với Elo trung bình trận).
            *   Tính `teamPerformanceFactor` (dựa trên chênh lệch Elo trung bình 2 đội).
            *   Các chỉ số KDA, CS, Gold được tạo ra dựa trên vai trò, `skillFactor`, `winFactor`, `teamPerformanceFactor`, và yếu tố ngẫu nhiên. Điều này giúp KDA của người chơi Elo cao khi "smurf" trở nên hợp lý hơn.

3.  **Thay Đổi Lớn trong Cách Tính Elo (`eloService.calculateEloDelta` và `matchService.updatePlayerAfterMatch` - Phiên bản 3.0):**
    *   **Đầu vào mới cho `calculateEloDelta`:** `playerRole`, `playerKDA`, `playerCS`, `playerGold` (lấy từ `generatePerformanceStats`).
    *   **Tính `baseEloChange`:** Vẫn như cũ (Win/Loss, K-Factor, chênh lệch Elo đội).
    *   **Tính `pbrAdjustment`:**
        *   Định nghĩa `PBR_BENCHMARKS` (KDA, CS/min, Gold/min kỳ vọng) cho từng vai trò.
        *   So sánh hiệu suất thực tế của người chơi (đã quy đổi ra /min nếu cần) với benchmark.
        *   Tính `performanceScore` tổng hợp (có trọng số cho KDA, CS, Gold).
        *   Quy đổi `performanceScore` thành điểm Elo `pbrAdjustment` (có giới hạn `MAX_PBR_POSITIVE/NEGATIVE_ADJUSTMENT`).
    *   **`eloDeltaWithPbr = baseEloChange + pbrAdjustment`.**
    *   **Thêm `streakAdjustment` (trong `updatePlayerAfterMatch`):**
        *   Theo dõi `currentWinStreak`, `currentLossStreak` của người chơi.
        *   Dựa trên `STREAK_THRESHOLDS`, cộng/trừ một lượng điểm nhỏ vào `eloDeltaWithPbr`.
    *   **`finalEloDelta = eloDeltaWithPbr + streakAdjustment`.**
    *   **Đảm bảo Elo >= 0:** `newElo = player.elo + finalEloDelta`. Nếu `newElo < 0`, `newElo` được đặt thành `0`. `eloChange` ghi vào lịch sử được điều chỉnh theo.
    *   **Lưu trữ chi tiết:** `players.matchHistory` và `matches` collection giờ đây lưu đầy đủ vai trò, tướng, KDA, CS, Gold, `eloChange` (đã bao gồm PBR và streak, và đã được điều chỉnh nếu chạm sàn 0), và `streakAdjustment`.

**Trạng Thái Tính Elo Hiện Tại (Rất Chi Tiết):**

1.  Người chơi bắt đầu với **0 Elo**.
2.  Khi một trận đấu kết thúc, với mỗi người chơi tham gia:
    a.  **`baseEloChange`** được tính dựa trên:
        *   Elo hiện tại của họ.
        *   K-Factor động (dựa trên số trận đã chơi và Elo hiện tại).
        *   Kết quả thắng/thua của đội họ.
        *   Chênh lệch Elo trung bình giữa đội họ và đội đối thủ (để tính Expected Score).
    b.  **`pbrAdjustment`** được tính dựa trên:
        *   So sánh KDA (tỷ lệ), CS/phút, Gold/phút của người chơi (được mô phỏng bởi `generatePerformanceStats` đã cải tiến) với các `PBR_BENCHMARKS` được định nghĩa sẵn cho vai trò mà họ đảm nhận trong trận đó.
        *   Mức độ "vượt trội" hay "kém hơn" benchmark này được quy thành một điểm Elo cộng/trừ, có giới hạn.
    c.  **`eloDeltaWithPbr = baseEloChange + pbrAdjustment`**.
    d.  **`streakAdjustment`** được tính dựa trên:
        *   Chuỗi thắng hoặc thua liên tiếp hiện tại của người chơi.
        *   Các ngưỡng `STREAK_THRESHOLDS` để xác định điểm bonus/malus.
    e.  **`finalEloDelta = eloDeltaWithPbr + streakAdjustment`**. Đây là tổng số điểm Elo người chơi sẽ nhận/mất *trước khi* xét sàn 0.
    f.  Elo mới của người chơi được tính: `player.elo_cũ + finalEloDelta`.
    g.  **Kiểm tra sàn Elo:** Nếu Elo mới < 0, nó được đặt thành 0.
    h.  `eloChange` thực tế được ghi vào lịch sử đấu (`matchHistory` và `matches`) là lượng điểm đã thực sự thay đổi sau khi áp dụng sàn 0.
    i.  Chuỗi thắng/thua của người chơi được cập nhật.

---

**Timeline (Các Mốc Chính Đã Hoàn Thành):**

1.  : Khởi tạo dự án, xây dựng logic Elo cơ bản (K-Factor, S, E) và mô phỏng trận đấu ngẫu nhiên đơn giản trên console.
2. : Quyết định sử dụng MongoDB. Thiết lập kết nối DB. Chuyển đổi dữ liệu người chơi sang lưu trữ trong MongoDB.
3.  : Bắt đầu xây dựng API với Express.js. Tái cấu trúc code thành services/controllers. Triển khai các API cơ bản cho Player và Simulate.
4.  : Thảo luận và triển khai collection `matches` để lưu trữ chi tiết toàn bộ trận đấu. Tạo API truy vấn `matches`.
5. : Bắt đầu tích hợp PBR:
    *   Thay đổi `INITIAL_ELO = 0`.
    *   Tạo collection `champions` và seed dữ liệu.
    *   Mô phỏng Vai trò, Tướng, và các chỉ số KDA, CS, Gold (hàm `generatePerformanceStats` phiên bản đầu).
6.  : Triển khai logic PBR vào `eloService.calculateEloDelta` (so sánh với benchmark, tính `pbrAdjustment`). Đảm bảo Elo không âm.
7.  : Thêm hệ thống Chuỗi Thắng/Thua (`currentWin/LossStreak`, `streakAdjustment`).
8.  : Cải thiện đáng kể hệ thống mô phỏng trận đấu (`simulateNewMatch`):
    *   Cải thiện `generatePerformanceStats` để KDA/CS/Gold "thật" hơn, xét đến chênh lệch Elo.
    *   Triển khai matchmaking dựa trên Elo (tìm người chơi trong `searchRange`, cân bằng Elo 2 đội).
    *   Gán vai trò và chọn tướng dựa trên `preferredRoles` và `championPool` của người chơi.

