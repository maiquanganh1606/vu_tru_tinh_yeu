import os
from flask import Flask, render_template

# Cấu hình thư mục template và static chuẩn
app = Flask(__name__, template_folder='200 days', static_folder='static')


@app.route('/')
def home():
    # 1. Đường dẫn đến thư mục ảnh
    image_folder = os.path.join('static', 'love_images')

    # 2. Kiểm tra xem thư mục có tồn tại không
    if not os.path.exists(image_folder):
        print(f"LỖI: Không tìm thấy thư mục {image_folder}")
        return f"Lỗi: Bạn chưa tạo thư mục {image_folder}", 404

    # 3. Lấy danh sách file (Chấp nhận tên Tiếng Việt)
    # Dùng .lower() để chấp nhận cả đuôi .PNG, .JPG (viết hoa)
    all_files = os.listdir(image_folder)
    images = []

    for f in all_files:
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            images.append(f)

    # --- DEBUG: In ra màn hình PyCharm để kiểm tra ---
    print("--- DANH SÁCH ẢNH TÌM THẤY ---")
    if len(images) > 0:
        for img in images:
            print(f"Found: {img}")
    else:
        print("KHÔNG TÌM THẤY ẢNH NÀO! Hãy kiểm tra lại thư mục.")
    print("--------------------------------")

    # Sắp xếp ảnh theo tên để hiển thị thứ tự đẹp hơn
    images.sort()

    return render_template('200 days (frontend).html', images=images)


if __name__ == '__main__':
    # host='0.0.0.0' giúp chạy ổn định hơn trên Mac
    app.run(debug=True, host='0.0.0.0', port=5001)