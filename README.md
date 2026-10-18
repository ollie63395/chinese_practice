# Cíhuì 词汇

Kho từ vựng tiếng Trung (tiếng Phổ thông) dành cho người Việt. Thêm những từ bạn học được, ôn lại bằng thẻ ghi nhớ, rồi vận dụng chúng trong bài luyện nói có bấm giờ.

## Tính năng

- **Kho từ vựng.** Mỗi từ gồm chữ Hán, pinyin có dấu thanh, nghĩa tiếng Việt, một hình ảnh (không bắt buộc) và bao nhiêu nhãn tùy thích. Tìm theo chữ Hán, pinyin (có hay không có dấu thanh đều được), nghĩa hoặc nhãn, và gõ tiếng Việt không dấu cũng tìm được; lọc theo nhãn; sắp xếp theo ngày thêm hoặc theo pinyin A–Z.
- **Thẻ ghi nhớ.** Ôn mọi từ, hoặc chỉ những nhãn bạn chọn. Cho mặt trước hiện tiếng Trung hoặc nghĩa, đánh dấu từng thẻ *Đã thuộc* hay *Chưa thuộc*, rồi ôn lại những thẻ chưa thuộc.
- **Luyện nói.** Chọn số từ và thời gian nói. Các từ được bốc ngẫu nhiên (từ cả kho hoặc theo nhãn); bạn có thể bỏ, đổi hoặc thêm từ, rồi chuẩn bị bao lâu tùy thích, kèm ghi chú. Đồng hồ chỉ chạy khi bạn bắt đầu nói. Trong lúc nói, nhấn vào từng từ sau khi đã dùng. Hết giờ sẽ có tiếng chuông.
- **Lịch sử luyện tập.** Mỗi buổi luyện nói được ghi lại cùng các từ, thời gian và ghi chú. Mở một buổi để xem lại, luyện lại các từ đó, hoặc xóa đi.
- **Sao lưu & khôi phục.** Tải mọi thứ (kể cả hình ảnh) về thành một tệp, rồi khôi phục trên thiết bị hoặc trình duyệt khác.
- Dùng được trên điện thoại và máy tính, ở chế độ sáng và tối. Từ vựng được đọc to bằng giọng tiếng Phổ thông nếu trình duyệt có sẵn.

## Dữ liệu của bạn

Mọi thứ được lưu ngay trong trình duyệt (IndexedDB) trên thiết bị bạn đang dùng. Không có gì được tải lên mạng, và không cần tài khoản.

Vì vậy, nếu bạn xóa dữ liệu trang web của trình duyệt thì từ vựng cũng mất theo. Thỉnh thoảng hãy tải một bản sao lưu ở mục **Sao lưu & khôi phục** (biểu tượng ở góc trên bên phải). Khi khôi phục, các từ và buổi luyện tập trong bản sao lưu được thêm vào dữ liệu hiện có; mục nào có ở cả hai nơi sẽ được thay bằng bản trong tệp sao lưu.

## Gõ pinyin

Trang web không thể tự chuyển bàn phím của bạn sang tiếng Trung, nên ô **Pinyin** tự đổi số thanh điệu thành dấu ngay khi bạn gõ: `ni3 hao3` → nǐ hǎo.

- Gõ số thanh điệu (1–4) ngay sau mỗi âm tiết. Có thể viết liền (`ni3hao3` → nǐhǎo) hoặc cách nhau.
- `5` (hoặc `0`) là thanh nhẹ: `xie4xie5` → xièxie.
- `v` hoặc `u:` cho ra ü: `lv4` → lǜ, `nv3` → nǚ.
- Dấu nháy để tách âm tiết: `xi1'an1` → Xī'ān. Chữ hoa được giữ nguyên: `Bei3jing1` → Běijīng.
- Gõ thêm một số sau âm tiết đã có dấu sẽ đổi dấu đó: `hǎo` + `4` → hào.
- Pinyin đã có dấu dán từ nơi khác được giữ nguyên.
- **Hãy tắt bộ gõ tiếng Việt (Telex/VNI) khi gõ pinyin.** Nếu không, bộ gõ sẽ đổi chữ của bạn (`er` → ẻ, `dd` → đ, và với VNI thì `ni3` → nỉ). Cíhuì sẽ báo lỗi nếu thấy chữ tiếng Việt lẫn vào pinyin.

## Phím tắt

| Ở đâu         | Phím                                                                 |
| ------------- | -------------------------------------------------------------------- |
| Thẻ ghi nhớ   | Phím cách/Enter: lật thẻ · → hoặc 2: đã thuộc · ← hoặc 1: chưa thuộc · Z: hoàn tác |
| Khi thêm từ   | Ctrl+Enter (⌘+Enter trên Mac): lưu                                    |

## Getting started

Requires Node.js 22.22 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

To try it on your phone over the same Wi-Fi, run `npm run dev -- --host` and open the "Network" address it prints. Data on the phone is separate from your computer's, so use a backup to move words across. Keeping the screen awake during a speech needs HTTPS, so that one feature won't work over a plain LAN address.

## Scripts

| Command            | What it does                                                         |
| ------------------ | -------------------------------------------------------------------- |
| `npm run dev`      | Start the development server                                         |
| `npm run build`    | Type-check and build the site into `dist/`                           |
| `npm run preview`  | Serve the built site locally                                         |
| `npm test`         | Run the unit tests (Vitest)                                          |
| `npm run test:e2e` | Run the browser tests (Playwright) on desktop and phone-sized screens |

On Windows the browser tests use the installed Microsoft Edge. Elsewhere, run `npx playwright install chromium` once first.

## Deploying

Cíhuì is a static site: run `npm run build` and upload the `dist/` folder to any static host (GitHub Pages, Netlify, Cloudflare Pages and so on). It uses `#/` URLs and relative asset paths, so it works from any sub-path without server configuration.

Fonts load from Google Fonts (Be Vietnam Pro, Noto Sans SC) and jsDelivr (LXGW WenKai, from the `lxgw-wenkai-webfont` package). If they can't be reached, system fonts are used instead.

## Project layout

```
src/
  db/           IndexedDB schema (Dexie) and the operations on words and practice logs
  lib/          Pinyin conversion, search, tags, backups, images, sound, speech and other helpers
  components/   Shared UI: layout, form fields, dialogs, the image and tag pickers
  pages/        One file per screen; pages/speaking/ holds the steps of a speaking practice
e2e/            Playwright browser tests
```

Built with React 19, TypeScript, Vite, Tailwind CSS 4, React Router and Dexie.
