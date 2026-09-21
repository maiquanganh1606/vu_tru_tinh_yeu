"""Create a private future letter interactively without exposing the answer."""
import getpass
import json
import os
import sys
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from werkzeug.security import generate_password_hash
from server.capsule import normalize_answer


def main():
    instance = Path(os.environ.get('LOVE_INSTANCE_PATH', str(Path(__file__).resolve().parent.parent / 'instance')))
    target = instance / 'capsule.json'
    title = input('Tên lá thư: ').strip()
    question = input('Câu hỏi kỷ niệm: ').strip()
    unlock_at = input('Giờ mở (ví dụ 2028-04-21T00:00:00+07:00): ').strip()
    date = datetime.fromisoformat(unlock_at)
    if date.tzinfo is None:
        raise ValueError('Ngày mở phải có múi giờ')
    answer = normalize_answer(getpass.getpass('Đáp án (ẩn): '))
    if answer != normalize_answer(getpass.getpass('Nhập lại đáp án: ')) or not answer:
        raise ValueError('Hai đáp án phải giống nhau và không rỗng')
    letter = Path(input('Đường dẫn file thư UTF-8 riêng tư: ').strip()).read_text(encoding='utf-8').strip()
    if not title or not question or not letter:
        raise ValueError('Tên, câu hỏi và thư không được trống')
    if target.exists() and input('Thay lá thư đã có? Gõ THAY: ').strip() != 'THAY':
        return
    instance.mkdir(parents=True, exist_ok=True)
    data = dict(id='future', title=title, question=question, unlock_at=unlock_at,
                answer_hash=generate_password_hash(answer), letter=letter)
    temp = target.with_suffix('.tmp')
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    temp.replace(target)
    print('Đã lưu thư riêng tư. Nội dung chỉ được trả khi đủ điều kiện.')


if __name__ == '__main__':
    main()
