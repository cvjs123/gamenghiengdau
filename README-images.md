# Game Nghiêng Đầu - Hướng dẫn sử dụng hình ảnh

## Cách thêm hình ảnh vào câu hỏi

### 1. Chuẩn bị hình ảnh
- Đặt hình ảnh vào folder `images/`
- Hỗ trợ các định dạng: JPG, PNG, SVG, GIF, WebP
- Khuyến nghị: SVG cho chất lượng tốt, JPG/PNG cho ảnh thực tế

### 2. Cấu trúc câu hỏi với hình ảnh
```json
{
  "q": "Câu hỏi của bạn",
  "A": "Đáp án A",
  "B": "Đáp án B",
  "correct": "A",
  "image": "images/ten_file_anh.jpg"
}
```

### 3. Câu hỏi không có hình ảnh
```json
{
  "q": "Câu hỏi không hình ảnh",
  "A": "Đáp án A",
  "B": "Đáp án B",
  "correct": "A"
}
```

### 4. Import câu hỏi
1. Mở game
2. Bấm nút "❓ Câu hỏi"
3. Chọn "Import từ JSON"
4. Chọn file JSON chứa câu hỏi

### 5. Ví dụ file JSON
Xem file `sample-questions-with-images.json` để có ví dụ hoàn chỉnh.

## Lưu ý
- Đường dẫn hình ảnh phải tương đối từ file HTML
- Hình ảnh sẽ tự động resize để fit trong khu vực câu hỏi
- Nếu hình ảnh không load được, câu hỏi vẫn hiển thị bình thường