**BÁO CÁO TOÀN DIỆN VỀ QUÁ TRÌNH PHÁT TRIỂN HỆ THỐNG MÔ PHỎNG ELO**

**Mục Tiêu Dự Án:** Xây dựng một hệ thống tính điểm Elo mới cho công ty Riot, tạo cơ hội cho mọi người cùng tham gia và theo dõi. Hệ thống cần đáp ứng các yêu cầu cụ thể sau:

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
        *   **Hệ Thống Chuỗi Thắng/Thua (Streaks):** Để phản ánh "momentum" và giúp người chơi nhanh chóng đạt đến Elo phù hợp hơn, một lượng điểm bonus/malus (ví dụ: +/- 0.5 Elo cho mỗi trận trong chuỗi, và bonus/malus lớn hơn tại các mốc 5, 10, 15 trận) được cộng/trừ thêm dựa trên độ dài chuỗi thắng hoặc thua liên tiếp của người chơi (`streakAdjustment`).
        *   **Elo Khởi Điểm và Sàn Elo:** Tất cả người chơi bắt đầu với **0 Elo**. Hệ thống đảm bảo điểm Elo của người chơi không bao giờ giảm xuống dưới 0.

3.  **Khả năng Random Kết Quả Trận Đấu (Ảnh hưởng Elo):**


4.  **Thiết Kế UI để Xem Thông Tin:**
    *   **Triển khai:** Một giao diện người dùng web dạng **Single Page Application (SPA)** đã được phát triển sử dụng **Vue.js (Vue 3) và Vite**. Giao diện này được thiết kế theo mô hình **Dashboard** để cung cấp cái nhìn tổng quan và chi tiết về hệ thống.
        *   **Điều hướng:** Sử dụng **Vue Router** để quản lý việc chuyển đổi giữa các trang (views) khác nhau.
        *   **Styling:** **Bootstrap 5** (thông qua CDN) và CSS tùy chỉnh được sử dụng để tạo kiểu nhanh chóng, đảm bảo tính responsive và mang phong cách "Liên Minh Huyền Thoại".
        *   **Tương tác Thời Gian Thực:** Sử dụng **Socket.IO** để cập nhật tiến trình mô phỏng nhiều trận đấu cho client mà không cần reload trang, tránh timeout HTTP và cung cấp trải nghiệm người dùng tốt hơn.
        *   **Các tính năng và thông tin hiển thị chính:**
            *   **Trang Leaderboard (`LeaderboardView.vue`):** Hiển thị bảng xếp hạng người chơi theo Elo (có phân trang). Cung cấp các nút điều khiển để mô phỏng N trận đấu (gửi yêu cầu qua WebSocket, có hiển thị thanh tiến trình và thông báo trạng thái toàn cục trong card controls), làm mới dữ liệu, và nút "Reset System Data" (kèm modal xác nhận).
            *   **Trang Player Profile (`PlayerProfileView.vue`):** Hiển thị thông tin chi tiết của từng người chơi. Trực quan hóa lịch sử 100 trận gần nhất bằng bảng (chi tiết Tướng, Vai trò, KDA, CS, Gold, Elo +/-, thông tin streak), biểu đồ đường biến động Elo, biểu đồ tròn tỷ lệ thắng/thua, và biểu đồ radar hiệu suất theo vai trò.
            *   **Trang Match Details (`MatchDetailView.vue`):** Hiển thị thông tin toàn diện của một trận đấu. Bao gồm "Scoreboard" tổng quan dạng một bảng duy nhất so sánh chỉ số hai đội. Đi kèm là các biểu đồ cột nhóm so sánh KDA và Economy giữa hai team. Cung cấp bảng chi tiết hiệu suất của 10 người chơi với **Grade (S, A, B...)** được tính toán ở frontend dựa trên PBR. Highlight người chơi nếu được điều hướng từ trang profile.
            *   **Trang Statistics (`StatisticsView.vue`):** Cung cấp các thống kê toàn server: số liệu tổng quan, biểu đồ Phân bố Elo, biểu đồ KDA/CS/Gold trung bình theo Vai trò, biểu đồ Tỷ lệ Chọn Tướng, và biểu đồ Tỷ lệ Thắng Tướng.
        *   **Trực quan hóa dữ liệu:** Sử dụng thư viện **Chart.js** (thông qua `vue-chartjs`).

---

**II. DÒNG CHẢY PHÁT TRIỂN VÀ CÁC QUYẾT ĐỊNH THIẾT KẾ CHÍNH**

1.  **Giai Đoạn 1: Nền Tảng Console:**
    *   Xây dựng logic Elo v1.0 và mô phỏng trận đấu console đơn giản.

2.  **Giai Đoạn 2: Chuyển Sang Backend API và MongoDB:**
    *   Sử dụng MongoDB. Phát triển backend API với Node.js và Express.js.
    *   Triển khai collection `players` và `matches`.

3.  **Giai Đoạn 3: Nâng Cao Hệ Thống Backend - Tích Hợp PBR và Chi Tiết Hóa Mô Phỏng:**
    *   `INITIAL_ELO = 0`. Seed ~167 tướng (chuẩn hóa `championId`). Người chơi có `preferredRoles`, `championPool`.
    *   Cải thiện `generatePerformanceStats` (xét `skillFactor`, `teamPerformanceFactor`).
    *   Cải thiện Matchmaking (tìm theo Elo, cân bằng đội, gán vai trò/tướng ưu tiên).
    *   Triển khai PBR (`pbrAdjustment`) và Streaks (`streakAdjustment`) chi tiết hơn, cho phép Elo và `eloChange` có phần thập phân.
    *   Sử dụng `@faker-js/faker` cho tên người chơi.

4.  **Giai Đoạn 4: Xây Dựng Giao Diện Người Dùng Frontend (Vue.js Dashboard) và Hoàn Thiện Backend:**
    *   Phát triển SPA dashboard (Vue.js, Vite, Vue Router, Bootstrap). Tạo các view chính.
    *   Sử dụng Chart.js cho biểu đồ.
    *   Triển khai logic tính "Grade" ở frontend.
    *   **Tích Hợp WebSocket (`socket.io`):**
        *   **Backend:** Thiết lập `socket.io` server, quản lý trạng thái mô phỏng toàn cục (`globalSimulationStatus`), phát các sự kiện tiến trình cho tất cả client. Logic mô phỏng nhiều trận được chuyển sang xử lý trong WebSocket handler.
        *   **Frontend:** Kết nối WebSocket, lắng nghe sự kiện global để cập nhật UI (thanh tiến trình, thông báo trạng thái trong `LeaderboardView.vue`). Nút "Run Simulation" gửi yêu cầu qua WebSocket.
    *   Hoàn thiện các API backend cho thống kê và cấu hình PBR.
    *   Triển khai phân trang cho bảng Leaderboard.
    *   Tinh chỉnh giao diện theo phong cách "Liên Minh Huyền Thoại".

---

**Trạng Thái Tính Elo Hiện Tại (Rất Chi Tiết):**

1.  Người chơi bắt đầu với **0 Elo**.

2.  Khi một trận đấu kết thúc, với mỗi người chơi tham gia, việc thay đổi Elo được xác định qua các bước:

    a.  **`baseEloChange`**: Dựa trên Elo hiện tại, K-Factor động, kết quả thắng/thua, và chênh lệch Elo trung bình giữa hai đội.

    b.  **`pbrAdjustment`**: Dựa trên KDA, CS/phút, Gold/phút so với benchmark của vai trò, có giới hạn.

    c.  **`eloDeltaWithPbr = baseEloChange + pbrAdjustment`**.

    d.  **`streakAdjustment`**: Bonus/malus dựa trên chuỗi thắng/thua, bao gồm bonus cơ bản mỗi trận trong chuỗi và bonus thêm tại các mốc. Có giới hạn tổng ảnh hưởng.

    e.  **`finalEloDelta = eloDeltaWithPbr + streakAdjustment`**. (Giá trị có thể là số thập phân)

    f.  Elo mới = `player.elo_cũ + finalEloDelta`.

    g.  Nếu Elo mới < 0, đặt thành 0.

    h.  `eloChange` thực tế ghi vào lịch sử là giá trị sau khi xét sàn 0.

    i.  Cập nhật `gamesPlayed`, chuỗi thắng/thua.

    j.  Lưu thông tin chi tiết (vai trò, tướng, KDA, CS, Gold, `eloChange`, `streakInfo`) vào `players.matchHistory` và `matches`.

---

**V. CÔNG NGHỆ SỬ DỤNG TRONG DỰ ÁN**

*   **Backend:**
    *   Node.js: [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
    *   Express.js: [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
    *   MongoDB: [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
    *   Socket.IO: [![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
    *   `mongodb` (Node.js Driver)
    *   `@faker-js/faker`: [![Faker.js](https://img.shields.io/badge/%40faker--js%2Ffaker-FF99CC?style=for-the-badge&logo=npm&logoColor=white)](https://fakerjs.dev/)

*   **Frontend:**
    *   Vue.js (Vue 3): [![Vue.js](https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
    *   Vite: [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
    *   Vue Router: [![Vue Router](https://img.shields.io/badge/Vue%20Router-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://router.vuejs.org/)
    *   Socket.IO Client
    *   Chart.js: [![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
    *   `vue-chartjs`
    *   Bootstrap 5: [![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
    *   Font Awesome (Cho Icons)

*   **Ngôn Ngữ Lập Trình Chính:**
    *   JavaScript (ES6+): [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

*   **Công Cụ Phát Triển và Quản Lý:**
    *   npm: [![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)
    *   Git & GitHub: [![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)](https://git-scm.com/)
    *   Visual Studio Code: [![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)

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
Hệ thống mô phỏng Elo đã được xây dựng và triển khai thành công, đáp ứng đầy đủ các yêu cầu ban đầu từ đề bài. Các tính năng cốt lõi như hệ thống tính Elo chi tiết cho 100 người chơi với lịch sử 100 trận, cơ chế cộng trừ điểm phức hợp (bao gồm K-Factor động, Performance-Based Rating, và yếu tố Chuỗi Thắng/Thua), khả năng tạo yếu tố ngẫu nhiên ảnh hưởng đến Elo, và một giao diện người dùng web dashboard trực quan, giàu thông tin đã được hoàn thiện. Việc tích hợp WebSocket giúp cải thiện trải nghiệm người dùng khi thực hiện các tác vụ mô phỏng kéo dài. Hệ thống hiện tại cung cấp một nền tảng vững chắc cho việc theo dõi, phân tích dữ liệu mô phỏng và có tiềm năng lớn cho việc mở rộng, tinh chỉnh thêm các tính năng trong tương lai.