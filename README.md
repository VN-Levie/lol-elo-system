
**BÁO CÁO TOÀN DIỆN VỀ QUÁ TRÌNH PHÁT TRIỂN HỆ THỐNG MÔ PHỎNG ELO**



**Mục Tiêu Dự Án (Theo Yêu Cầu Giám Đốc):** Xây dựng một hệ thống tính điểm Elo mới cho công ty Riot, tạo cơ hội cho mọi người cùng tham gia và theo dõi. Hệ thống cần đáp ứng các yêu cầu cụ thể sau:

1.  Xây dựng hệ thống tính Elo của 100 người chơi, dựa trên 100 trận đấu gần nhất của mỗi người.
2.  Điều kiện cộng trừ và hệ số điểm do đội ngũ tự nghiên cứu và đề xuất.
3.  Có khả năng tạo yếu tố ngẫu nhiên ảnh hưởng đến kết quả Elo của một số người chơi trong quá trình hệ thống vận hành.
4.  Thiết kế giao diện người dùng (UI) để có thể xem được các thông tin đang có trong hệ thống.

---

**I. ĐÁP ỨNG CÁC YÊU CẦU CỐT LÕI CỦA DỰ ÁN**

1.  **Hệ thống tính Elo cho 100 người chơi và 100 trận đấu gần nhất:**
    *   **Triển khai:** Hệ thống được thiết kế để quản lý và tính toán điểm Elo cho **100 người chơi** mặc định khi khởi tạo (`TOTAL_PLAYERS_INIT`). Dữ liệu của mỗi người chơi được lưu trữ trong collection `players` của MongoDB. Mỗi người chơi có một trường `matchHistory`, là một mảng được giới hạn để chỉ lưu trữ thông tin của **tối đa 100 trận đấu gần nhất**. Giới hạn này được đảm bảo thông qua việc sử dụng toán tử `$slice` của MongoDB mỗi khi một trận đấu mới được thêm vào lịch sử (`$push`). Điểm Elo của mỗi người chơi được tự động cập nhật và lưu lại sau mỗi trận đấu mà họ tham gia trong quá trình mô phỏng.

2.  **Nghiên cứu và Triển khai Điều Kiện Cộng/Trừ Điểm và Hệ Số:**
    *   **Triển khai:** Quá trình nghiên cứu đã dẫn đến việc áp dụng một hệ thống tính điểm Elo đa yếu tố:
        *   **Công thức Elo Cơ Bản:** Nền tảng là công thức Elo chuẩn: `R_new = R_old + K * (S - E)`.
        *   **K-Factor Động (Dynamic K-Factor):** Hệ số `K` không cố định mà thay đổi dựa trên kinh nghiệm và trình độ của người chơi:
            *   Người chơi mới (ít hơn 30 trận) có K-Factor cao (ví dụ: 40) để điểm Elo phản ánh nhanh hơn trình độ thực.
            *   Người chơi có Elo rất cao (ví dụ: >2200) có K-Factor thấp (ví dụ: 10) để điểm Elo ổn định hơn ở các bậc rank cao.
            *   Người chơi thông thường có K-Factor trung bình (ví dụ: 20).
        *   **Performance-Based Rating (PBR):** Một yếu tố quan trọng được thêm vào để việc cộng/trừ điểm không chỉ dựa vào kết quả thắng/thua của đội. Điểm Elo nhận/mất được điều chỉnh thêm một lượng nhỏ (`pbrAdjustment`, giới hạn ví dụ +/- 5 Elo) dựa trên hiệu suất cá nhân của người chơi trong trận đấu (đo bằng KDA, CS, Gold) so với các ngưỡng kỳ vọng (`PBR_BENCHMARKS`) được định nghĩa cho từng vai trò (Role) cụ thể.
        *   **Hệ Thống Chuỗi Thắng/Thua (Streaks):** Để phản ánh "momentum" và giúp người chơi nhanh chóng đạt đến Elo phù hợp hơn, một lượng điểm bonus/malus nhỏ (ví dụ: +/- 1 đến 3 Elo) được cộng/trừ thêm dựa trên độ dài chuỗi thắng hoặc thua liên tiếp của người chơi (`streakAdjustment`).
        *   **Elo Khởi Điểm và Sàn Elo:** Tất cả người chơi bắt đầu với **0 Elo**. Hệ thống đảm bảo điểm Elo của người chơi không bao giờ giảm xuống dưới 0.

3.  **Khả năng Random Kết Quả Trận Đấu (Ảnh hưởng Elo):**
    *   **Triển khai:** Một API endpoint riêng (`POST /api/randomize-event`) đã được xây dựng. Khi được kích hoạt, service `matchService.triggerRandomEloInterference` sẽ chọn ngẫu nhiên một số lượng người chơi và áp dụng một sự điều chỉnh Elo nhỏ (cộng hoặc trừ) vào điểm số hiện tại của họ. Sự điều chỉnh này hoàn toàn độc lập với kết quả của bất kỳ trận đấu cụ thể nào, mô phỏng các yếu tố may mắn bất ngờ hoặc những biến động không lường trước có thể ảnh hưởng đến điểm số của người chơi trong một hệ thống thực.

4.  **Thiết Kế UI để Xem Thông Tin:**
    *   **Triển khai:** Một giao diện người dùng web dạng **Single Page Application (SPA)** đã được phát triển sử dụng **Vue.js (Vue 3) và Vite**. Giao diện này được thiết kế theo mô hình **Dashboard** để cung cấp cái nhìn tổng quan và chi tiết về hệ thống.
        *   **Điều hướng:** Sử dụng **Vue Router** để quản lý việc chuyển đổi giữa các trang (views) khác nhau.
        *   **Styling:** **Bootstrap 5** (thông qua CDN) được sử dụng để tạo kiểu nhanh chóng và đảm bảo giao diện có tính responsive.
        *   **Các tính năng và thông tin hiển thị chính:**
            *   **Trang Leaderboard (`LeaderboardView.vue`):** Hiển thị bảng xếp hạng người chơi theo Elo (có thể tùy chỉnh số lượng người chơi hiển thị). Cung cấp các nút điều khiển để mô phỏng N trận đấu (với bộ đếm thời gian thực thi), làm mới dữ liệu, và nút "Reset System Data" (kèm modal xác nhận) để khởi tạo lại toàn bộ hệ thống. Cho phép chuyển đổi hiển thị Leaderboard giữa dạng bảng và biểu đồ cột ngang (Top N Players), với logic tự động chuyển về bảng nếu số lượng hiển thị quá lớn.
            *   **Trang Player Profile (`PlayerProfileView.vue`):** Hiển thị thông tin chi tiết của một người chơi khi được chọn từ Leaderboard (bao gồm Elo, số trận, chuỗi thắng/thua). Trực quan hóa lịch sử 100 trận gần nhất bằng bảng (chi tiết Tướng, Vai trò, KDA, CS, Gold, Elo +/-), biểu đồ đường biến động Elo, biểu đồ tròn tỷ lệ thắng/thua, và biểu đồ radar hiệu suất theo vai trò.
            *   **Trang Match Details (`MatchDetailView.vue`):** Hiển thị thông tin toàn diện của một trận đấu cụ thể (ID, thời gian, đội thắng). Bao gồm một "Scoreboard" tổng quan dạng một bảng duy nhất so sánh trực tiếp tổng Kills, Deaths, Assists, Gold, CS của hai đội. Đi kèm là các biểu đồ cột nhóm so sánh KDA và Economy (Gold, CS) giữa hai team. Cung cấp bảng chi tiết hiệu suất của 10 người chơi tham gia trận (Tướng, Vai trò, KDA, CS, Gold, Elo +/-, và **Grade (S, A, B...)** được tính toán ở frontend dựa trên PBR).
            *   **Trang Statistics (`StatisticsView.vue`):** Cung cấp các thống kê toàn server: các số liệu tổng quan (tổng người chơi, tổng trận, Elo trung bình), biểu đồ Phân bố Elo, biểu đồ KDA/CS/Gold trung bình theo Vai trò, biểu đồ Tỷ lệ Chọn Tướng (Top N), và biểu đồ Tỷ lệ Thắng Tướng (Top N, có lọc theo số trận tối thiểu).
        *   **Trực quan hóa dữ liệu:** Sử dụng thư viện **Chart.js** (thông qua `vue-chartjs`) để vẽ các loại biểu đồ đa dạng, giúp người dùng dễ dàng nắm bắt thông tin.

---

**II. DÒNG CHẢY PHÁT TRIỂN VÀ CÁC QUYẾT ĐỊNH THIẾT KẾ CHÍNH**

1.  **Giai Đoạn 1: Nền Tảng Console:**
    *   Bắt đầu bằng việc xây dựng logic Elo cốt lõi (công thức Elo, K-Factor động cơ bản) và mô phỏng trận đấu đơn giản trên console để kiểm tra tính đúng đắn của thuật toán. Dữ liệu được lưu trữ tạm thời trong bộ nhớ.

2.  **Giai Đoạn 2: Chuyển Sang Backend API và MongoDB:**
    *   Nhận thấy sự cần thiết của việc lưu trữ dữ liệu bền vững, **MongoDB** được chọn làm cơ sở dữ liệu.
    *   Phát triển backend API sử dụng **Node.js và Express.js**, tái cấu trúc mã nguồn thành các `services` và `controllers` để quản lý logic nghiệp vụ và xử lý request.
    *   Triển khai collection `players` để lưu thông tin người chơi.
    *   Bổ sung collection `matches` để lưu trữ chi tiết toàn bộ các trận đấu đã diễn ra, giải quyết vấn đề khó khăn khi truy vấn thông tin tổng hợp trận đấu từ lịch sử cá nhân của từng người chơi.

3.  **Giai Đoạn 3: Nâng Cao Hệ Thống Backend - Tích Hợp PBR và Chi Tiết Hóa Mô Phỏng:**
    *   **Thay đổi Elo Khởi Điểm:** Đặt `INITIAL_ELO = 0` cho tất cả người chơi.
    *   **Xây Dựng Hệ Thống Tướng:** Tạo collection `champions` trong MongoDB và seed dữ liệu với khoảng **167 tướng**, với `championId` được chuẩn hóa theo key của Riot Data Dragon. Người chơi được gán một `championPool` (tướng hay chơi) ngẫu nhiên.
    *   **Xây Dựng Hệ Thống Vai Trò:** Người chơi được gán `preferredRoles` (vai trò yêu thích) ngẫu nhiên.
    *   **Cải Tiến Logic Matchmaking:**
        *   Thay vì chọn 10 người chơi hoàn toàn ngẫu nhiên, hệ thống được nâng cấp để ưu tiên ghép những người chơi có Elo gần nhau (`searchRange`).
        *   Sau khi chọn được 10 người, thuật toán `findBalancedTeams` được sử dụng để chia thành 2 đội có chênh lệch Elo trung bình thấp nhất.
        *   Hàm `assignRolesToTeam` sau đó gán vai trò và chọn tướng cho mỗi người chơi trong đội của họ, ưu tiên `preferredRoles` và `championPool`.
    *   **Mô Phỏng Chỉ Số Hiệu Suất Cá Nhân (`generatePerformanceStats`):** Hàm này được phát triển để tạo ra các chỉ số KDA, CS, Gold giả lập một cách "thông minh" hơn, có xem xét đến `skillFactor` (chênh lệch Elo cá nhân so với Elo trung bình trận) và `teamPerformanceFactor` (chênh lệch Elo trung bình hai đội), giúp các chỉ số (đặc biệt là KDA của người chơi Elo cao) trở nên hợp lý hơn trong các kịch bản khác nhau.
    *   **Triển Khai Performance-Based Rating (PBR) trong `eloService.calculateEloDelta`:**
        *   Định nghĩa `PBR_BENCHMARKS` cho từng vai trò.
        *   Tính toán `pbrAdjustment` dựa trên so sánh hiệu suất thực tế (KDA, CS/phút, Gold/phút) với benchmark, có trọng số và giới hạn điểm cộng/trừ.
    *   **Tích Hợp Hệ Thống Chuỗi Thắng/Thua (Streaks):** Theo dõi `currentWinStreak` và `currentLossStreak`, áp dụng `streakAdjustment` (bonus/malus Elo nhỏ) vào tổng điểm Elo thay đổi.
    *   **Sử Dụng `@faker-js/faker`:** Tạo tên người chơi ngẫu nhiên và đa dạng hơn.
    *   **Đảm bảo Elo >= 0 và Lưu Trữ Chi Tiết:** Điểm Elo cuối cùng không bao giờ âm. Toàn bộ thông tin chi tiết (vai trò, tướng, KDA, CS, Gold, `eloChange`, `streakAdjustment`) được lưu vào `players.matchHistory` và `matches`.

4.  **Giai Đoạn 4: Xây Dựng Giao Diện Người Dùng Frontend (Vue.js Dashboard):**
    *   Phát triển một SPA dashboard sử dụng Vue.js, Vite, Vue Router và Bootstrap.
    *   Tạo các view (Leaderboard, Player Profile, Match Details, Statistics) để hiển thị dữ liệu một cách trực quan.
    *   Sử dụng Chart.js để vẽ các biểu đồ phân tích (biến động Elo, phân bố Elo, tỷ lệ thắng/thua, so sánh team, thống kê tướng/vai trò).
    *   Triển khai logic tính toán "Grade" (S,A,B...) ở frontend trong `MatchDetailView.vue` dựa trên dữ liệu PBR nhận được từ backend (thông qua API config `/api/config/pbr-settings`).
    *   Hoàn thiện các chức năng tương tác người dùng như mô phỏng N trận, reset hệ thống (với modal xác nhận), tùy chỉnh số lượng hiển thị trên leaderboard.

---

**Trạng Thái Tính Elo Hiện Tại (Rất Chi Tiết):**

1.  Người chơi bắt đầu với **0 Elo**.
2.  Khi một trận đấu kết thúc, với mỗi người chơi tham gia, việc thay đổi Elo được xác định qua các bước:
    a.  **`baseEloChange`** được tính dựa trên: Elo hiện tại của họ, K-Factor động, kết quả thắng/thua của đội họ, và chênh lệch Elo trung bình giữa đội họ và đội đối thủ.
    b.  **`pbrAdjustment`** được tính dựa trên: So sánh KDA (tỷ lệ), CS/phút, Gold/phút của người chơi (mô phỏng bởi `generatePerformanceStats`) với `PBR_BENCHMARKS` cho vai trò của họ. Mức độ chênh lệch này được quy đổi thành điểm Elo cộng/trừ (có giới hạn).
    c.  **`eloDeltaWithPbr = baseEloChange + pbrAdjustment`**.
    d.  **`streakAdjustment`** được tính dựa trên: Chuỗi thắng/thua hiện tại và `STREAK_THRESHOLDS`.
    e.  **`finalEloDelta = eloDeltaWithPbr + streakAdjustment`**.
    f.  Elo mới của người chơi được tính: `player.elo_cũ + finalEloDelta`.
    g.  Nếu Elo mới < 0, nó được đặt thành 0.
    h.  `eloChange` thực tế được ghi vào lịch sử đấu là lượng điểm đã thực sự thay đổi sau khi áp dụng sàn 0.
    i.  Chuỗi thắng/thua, số trận đã chơi được cập nhật.
    j.  Thông tin chi tiết (vai trò, tướng, KDA, CS, Gold, `eloChange`, `streakAdjustment`) được lưu vào `players.matchHistory` và `matches`.

---

**V. CÔNG NGHỆ SỬ DỤNG TRONG DỰ ÁN**

*   **Backend:**
    *   Node.js: [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
    *   Express.js: [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
    *   MongoDB: [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
    *   `mongodb` (Node.js Driver)
    *   `@faker-js/faker`: [![Faker.js](https://img.shields.io/badge/%40faker--js%2Ffaker-FF99CC?style=for-the-badge&logo=npm&logoColor=white)](https://fakerjs.dev/)

*   **Frontend:**
    *   Vue.js (Vue 3): [![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
    *   Vite: [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
    *   Vue Router: [![Vue Router](https://img.shields.io/badge/Vue%20Router-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://router.vuejs.org/)
    *   Chart.js: [![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
    *   `vue-chartjs`
    *   Bootstrap 5: [![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)

*   **Ngôn Ngữ Lập Trình Chính:**
    *   JavaScript (ES6+): [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

*   **Công Cụ Phát Triển và Quản Lý:**
    *   npm: [![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)
    *   Git & GitHub (Giả định): [![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)](https://git-scm.com/)
    *   Visual Studio Code (Giả định): [![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)

---

**VI. LỜI CẢM ƠN VÀ CREDIT**

Quá trình phân tích, thiết kế và triển khai dự án này đã nhận được sự hỗ trợ và gợi ý đáng kể từ các mô hình ngôn ngữ lớn:

*   **Gemini:** Đã đóng góp vào việc phân tích yêu cầu, đề xuất các giải pháp kiến trúc, cung cấp các đoạn mã nguồn khởi tạo và gỡ lỗi, cũng như đưa ra các ý tưởng cải tiến cho hệ thống Elo, PBR, và mô phỏng trận đấu.
    [![Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
*   **ChatGPT:** Đã hỗ trợ trong việc tìm kiếm thông tin, giải thích các khái niệm, và đưa ra các ví dụ mã nguồn liên quan đến các công nghệ và thuật toán được sử dụng.
    [![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

Sự kết hợp giữa yêu cầu cụ thể từ người dùng và khả năng hỗ trợ từ các mô hình AI này đã giúp dự án đạt được tiến độ và chất lượng như hiện tại.

---

**Kết Luận:**
Hệ thống mô phỏng Elo đã được xây dựng và triển khai thành công, đáp ứng đầy đủ các yêu cầu ban đầu từ đề bài. Các tính năng cốt lõi như hệ thống tính Elo chi tiết cho 100 người chơi với lịch sử 100 trận, cơ chế cộng trừ điểm phức hợp (bao gồm K-Factor động, Performance-Based Rating, và yếu tố Chuỗi Thắng/Thua), khả năng tạo yếu tố ngẫu nhiên ảnh hưởng đến Elo, và một giao diện người dùng web dashboard trực quan, giàu thông tin đã được hoàn thiện. Hệ thống hiện tại cung cấp một nền tảng vững chắc cho việc theo dõi, phân tích dữ liệu mô phỏng và có tiềm năng lớn cho việc mở rộng, tinh chỉnh thêm các tính năng trong tương lai.