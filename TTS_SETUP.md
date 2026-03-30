# TTS Proxy Setup Guide

## Bước 1: Chuẩn bị API Key

### Nếu dùng FPT.AI (khuyến nghị cho Tiếng Việt)
1. Đăng ký tại: https://fpt.ai/
2. Lấy API Key từ dashboard
3. Lưu ý: api_key (không phải access_token)

## Bước 2: Cấu hình

### Cách 1: Dùng file `.env` (Khuyến nghị)
1. Copy `.env.example` → tạo `.env`
2. Mở `.env` với text editor
3. Thay `YOUR_FPT_API_KEY_HERE` bằng API key của bạn
4. Lưu file

### Cách 2: Dùng PowerShell script
1. Mở `start-tts-proxy.ps1`
2. Thay `YOUR_FPT_API_KEY_HERE` bằng API key
3. Chạy script

### Cách 3: Manual (PowerShell)
```powershell
$env:TTS_PROVIDER = 'fpt'
$env:PORT = '8787'
$env:FPT_TTS_API_KEY = 'YOUR_API_KEY'
$env:FPT_TTS_VOICE = 'banmai'
node tts-proxy.mjs
```

## Bước 3: Chạy Proxy

```powershell
# Cách 1: Với .env (dễ nhất)
node tts-proxy.mjs

# Cách 2: Với script
.\start-tts-proxy.ps1

# Cách 3: Với port khác
$env:PORT = '8788'
node tts-proxy.mjs
```

**Nếu thấy:**
```
============================================================
[STARTUP] TTS proxy listening on http://localhost:8787
[STARTUP] Provider: FPT
============================================================
```
→ ✅ Proxy đang chạy bình thường!

## Bước 4: Cấu hình Game

1. Mở game (index.html)
2. Tìm mục "Thiết lập giọng nói"
3. Nhập URL: `http://localhost:8787/tts`
4. Lưu

## Troubleshooting

### Lỗi: "Port 8787 already in use"
→ Proxy đã chạy hoặc cổng bị chiếm. Dùng port khác:
```powershell
$env:PORT = '8788'
node tts-proxy.mjs
```

### Lỗi: "Missing FPT_TTS_API_KEY"
→ API key chưa được set. Kiểm tra file `.env` hoặc environment variable

### Lỗi: "FPT TTS failed: 401"
→ API key sai hoặc hết hạn. Kiểm tra lại key

### API được gọi nhưng không phát âm trong game (Chrome)
→ Kiểm tra Console trong DevTools (F12):
- Log `[TTS] Calling API: ...` → API được gọi ✓
- Nếu không thấy → URL chưa được set trong game

## Debug

### Xem logs từ proxy
Khi gọi tên học sinh, terminal sẽ hiện:
```
[REQUEST] GET /tts?text=...
[TTS] Synthesizing text: "..."
[FPT] Calling API with voice=banmai
[FPT] API Response: {...}
[FPT] Polling async URL: https://...
[FPT] Poll attempt 1/60: status=202
...
[FPT] Audio ready! Size: 12345 bytes
[TTS] Success! Returning 12345 bytes
```

### Xem logs từ game (Browser DevTools)
Nhấn **F12** → **Console** → khi gọi tên sẽ thấy `[TTS]` messages

## Các giọng nói FPT.AI
- `banmai` - Nữ (dễ nghe)
- `thuthanh` - Nữ (chuyên nghiệp)
- `lethanh` - Nam
- `trinhtrang` - Nữ
- `anhthu` - Nữ

Thay đổi trong `.env`:
```
FPT_TTS_VOICE=thuthanh
```

Rồi restart proxy (Ctrl+C → chạy lại)
