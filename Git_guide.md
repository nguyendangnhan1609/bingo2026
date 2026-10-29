# Hướng dẫn đẩy code lên GitHub với tài khoản khác

## Mục tiêu

Đẩy code lên GitHub bằng tài khoản `nguyendangnhan1609` thay vì tài khoản mặc định đang cấu hình trên máy.

---

## Bước 1: Chuẩn bị thư mục project

Trước tiên, mở terminal và `cd` vào thư mục project:

```bash
cd D:\PROJECT\trunk
```

Kiểm tra Git đã nhận diện thư mục chưa:

```bash
git status
```

---

### Xử lý lỗi thường gặp ở Bước 1

#### Lỗi: `fatal: not in a git directory`

Thư mục chưa có Git — cần khởi tạo:

```bash
git init
```

#### Lỗi: `fatal: detected dubious ownership in repository`

Git từ chối vì thư mục thuộc user khác (thường xảy ra khi project được tạo bởi user/process khác). Chạy lệnh sau để thêm ngoại lệ:

```bash
git config --global --add safe.directory D:/PROJECT/trunk
```

Sau đó chạy lại `git status` — sẽ hoạt động bình thường.

---

## Bước 2: Tạo file .gitignore

Tạo file `.gitignore` ở thư mục gốc của project để Git bỏ qua các file/thư mục không cần thiết.

### Tạo nhanh bằng lệnh

```bash
echo node_modules/ >> .gitignore
echo *_BK >> .gitignore
```

### Hoặc tạo thủ công

Tạo file `.gitignore` tại `D:\PROJECT\trunk\.gitignore` với nội dung:

```
# Thư mục dependencies
node_modules/

# File backup
*_BK
```

### Kiểm tra lại

```bash
git status
```

> Các file `*_BK` (như `server.js_BK`) và thư mục `node_modules/` sẽ không còn xuất hiện trong danh sách "Untracked files".

### Nếu node_modules đã được Git theo dõi từ trước

Cần xóa khỏi tracking (không xóa file thật):

```bash
git rm -r --cached node_modules/
```

---

## Bước 3: Kiểm tra cấu hình Git hiện tại

```bash
git config --global user.name
git config --global user.email
```

---

## Bước 4: Đặt thông tin tài khoản cho repository hiện tại

Chạy lệnh này **bên trong thư mục project** (không dùng `--global` để tránh ảnh hưởng tài khoản chính):

```bash
git config user.name "nguyendangnhan1609"
git config user.email "nguyendangnhan1609@gmail.com"
```

> Thay `email-cua-tai-khoan@gmail.com` bằng email đăng ký GitHub của tài khoản `nguyendangnhan1609`.

---

## Bước 5: Cấu hình remote URL với thông tin xác thực

### Cách 1 – Dùng Personal Access Token (khuyến nghị)

GitHub không còn chấp nhận mật khẩu thông thường qua HTTPS từ tháng 8/2021. Cần tạo **Personal Access Token (PAT)**:

1. Đăng nhập GitHub bằng tài khoản `nguyendangnhan1609`
2. Vào **Settings → Developer settings → Personal access tokens → Tokens (classic)**
3. Nhấn **Generate new token**, chọn scope `repo`
4. Copy token vừa tạo (chỉ hiển thị 1 lần)

Sau đó thêm remote URL có token:

**Lần đầu (chưa có remote):**

```bash
git remote add origin https://nguyendangnhan1609:<TOKEN>@github.com/nguyendangnhan1609/<ten-repo>.git
```

**Nếu đã có remote, muốn đổi URL:**

```bash
git remote set-url origin https://nguyendangnhan1609:<TOKEN>@github.com/nguyendangnhan1609/<ten-repo>.git
```

> Thay `<TOKEN>` bằng token vừa tạo, `<ten-repo>` bằng tên repository.
> Lỗi `No such remote 'origin'` nghĩa là chưa có remote — phải dùng `git remote add`.

### Cách 2 – Dùng Git Credential Manager (nhập khi hỏi)

```bash
git remote add origin https://github.com/nguyendangnhan1609/<ten-repo>.git
```

Khi chạy `git push`, Git sẽ hỏi username/password (hoặc token). Nhập:
- **Username:** `nguyendangnhan1609`
- **Password:** dán Personal Access Token vào đây

---

## Bước 6: Kiểm tra remote URL

```bash
git remote -v
```

---

## Bước 7: Đẩy code lên GitHub

```bash
git add .
git commit -m "nội dung commit"
git push origin main
```

> Thay `main` bằng tên branch thực tế nếu khác (ví dụ: `master`, `develop`).

---

## Bước 8: Xóa credential cache (nếu cần đổi lại tài khoản)

Git Credential Manager (GCM) có thể lưu token cũ và override PAT mới, gây lỗi 403 dù token hợp lệ.

### Kiểm tra credential GCM đang dùng

```bash
printf 'protocol=https\nhost=github.com\n' | git credential fill
```

Nếu `password` hiện ra là token cũ (bắt đầu bằng `gho_`) → cần xóa.

### Xóa credential cũ

```bash
printf 'protocol=https\nhost=github.com\nusername=nguyendangnhan1609\n' | git credential reject
```

Kiểm tra lại bằng `git credential fill` — lần này phải hiện đúng PAT mới.

### Xóa thủ công qua Windows Credential Manager

```
Control Panel → Credential Manager → Windows Credentials
→ Tìm mục "git:https://github.com" → Xóa
```

---

## Lưu ý bảo mật

- **Không lưu mật khẩu hoặc token trực tiếp vào file** trong repository.
- **Không paste token vào chat, email, hay bất kỳ nơi nào có thể bị lưu lại** — GitHub tự động quét và vô hiệu hóa token bị lộ, gây lỗi 403.
- Ưu tiên dùng **Personal Access Token** thay vì mật khẩu tài khoản.
- Sau khi dùng xong, có thể thu hồi token trên GitHub: **Settings → Developer settings → Personal access tokens**.
- Không commit file `.env` hoặc bất kỳ file nào chứa thông tin xác thực.

### Lỗi 403 – Permission denied

```
remote: Permission to <repo>.git denied to <user>.
fatal: unable to access '...': The requested URL returned error: 403
```

Nguyên nhân thường gặp:
1. **Token bị lộ và GitHub tự thu hồi** → Tạo token mới, cập nhật remote URL
2. **Token không có scope `repo`** → Tạo token mới, chọn đúng scope
3. **Token hết hạn** → Tạo token mới

Cập nhật remote URL sau khi có token mới:

```bash
git remote set-url origin https://nguyendangnhan1609:<TOKEN_MỚI>@github.com/nguyendangnhan1609/bingo2026.git
```

---

## Tóm tắt nhanh

| Bước | Lệnh |
|------|------|
| Tạo .gitignore | `echo node_modules/ >> .gitignore && echo *_BK >> .gitignore` |
| Đặt user local | `git config user.name "nguyendangnhan1609"` |
| Thêm remote (lần đầu) | `git remote add origin https://nguyendangnhan1609:<TOKEN>@github.com/...` |
| Add + Commit | `git add . && git commit -m "message"` |
| Push | `git push origin main` |
