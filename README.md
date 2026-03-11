# PhoneCrawl V6 - So sánh giá iPhone cũ Việt Nam

Ứng dụng web crawl và so sánh giá iPhone cũ từ **13 cửa hàng** uy tín tại Việt Nam, sử dụng [FireCrawl API](https://firecrawl.dev) để trích xuất dữ liệu sản phẩm.

## Tính năng

- **Crawl real-time** từ 13 cửa hàng lớn
- **JSON Extraction** - sử dụng FireCrawl LLM extraction mode để lấy dữ liệu có cấu trúc
- **Tìm kiếm & lọc** sản phẩm theo tên, cửa hàng
- **Sắp xếp** theo giá, tên, cửa hàng
- **Xuất CSV** kết quả
- **Theo dõi tiến trình** real-time cho từng cửa hàng
- **Responsive** - hoạt động trên mọi thiết bị

## Cửa hàng được hỗ trợ

| # | Cửa hàng | URL |
|---|----------|-----|
| 1 | Hoàng Hà Mobile | hoanghamobile.com |
| 2 | CellphoneS | cellphones.com.vn |
| 3 | Di Động Việt | didongviet.vn |
| 4 | OneWay Mobile | onewaymobile.vn |
| 5 | ClickBuy | clickbuy.com.vn |
| 6 | TechOne | techone.vn |
| 7 | VietTablet | viettablet.com |
| 8 | ShopDunk | shopdunk.com |
| 9 | Táo Đen Shop | taodenshop.com |
| 10 | MobileCity | mobilecity.vn |
| 11 | 24hStore | 24hstore.vn |
| 12 | Điện Thoại Vui | dienthoaivui.com.vn |
| 13 | Đức Huy Mobile | duchuymobile.com |

## Cài đặt & Chạy local

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/phone-crawl.git
cd phone-crawl

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## Deploy lên Vercel

### Cách 1: Import từ GitHub

1. Push code lên GitHub repository
2. Truy cập [vercel.com/new](https://vercel.com/new)
3. Import repository
4. Click **Deploy** — Vercel tự nhận diện Next.js

### Cách 2: Vercel CLI

```bash
# Cài Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Sử dụng

1. Lấy API key từ [firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys)
2. Nhập API key vào ô trên giao diện
3. Chọn cửa hàng muốn crawl
4. Nhấn **"Bắt đầu crawl"**
5. Chờ kết quả và tìm kiếm / lọc / xuất CSV

## Tech Stack

- **Next.js 14** — App Router
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling
- **FireCrawl API** — Web scraping với JSON extraction mode

## Cấu trúc project

```
├── app/
│   ├── api/
│   │   ├── scrape-single/route.ts  # API endpoint crawl từng cửa hàng
│   │   └── stores/route.ts         # API lấy danh sách cửa hàng
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Trang chính
├── components/
│   ├── ApiKeyInput.tsx
│   ├── Header.tsx
│   ├── ProductTable.tsx
│   ├── ProgressPanel.tsx
│   ├── StatsBar.tsx
│   └── StoreSelector.tsx
├── lib/
│   ├── stores.ts                    # Cấu hình cửa hàng
│   └── types.ts
├── vercel.json
└── package.json
```

## Lưu ý

- API key FireCrawl chỉ được lưu trong browser session, không gửi đi đâu ngoài FireCrawl API
- Mỗi lần crawl 1 cửa hàng tiêu tốn ~5 credits (1 scrape + 4 JSON extraction)
- Crawl 13 cửa hàng ≈ 65 credits
- Free tier FireCrawl: 500 credits/tháng

## License

MIT
