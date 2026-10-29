// Chức năng bổ sung: Nhận giải (STK) + Chat riêng 1-1.
// Module độc lập, được server.js nạp trong try/catch. Đặt ENABLE_EXTRA=false để tắt.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data_private");
const PRIZE_FILE = path.join(DATA_DIR, "prizes.json");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");
const MAX_SESSIONS_PER_USER = 50;
const MIN_SEND_INTERVAL = 1000; // ms giữa 2 tin của cùng 1 người
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5MB mỗi ảnh
const IMG_TTL_MS = 7 * 24 * 3600 * 1000; // giữ ảnh 7 ngày
const MIN_UPLOAD_INTERVAL = 3000; // ms giữa 2 lần gửi ảnh của cùng 1 người
const IMG_NAME_RE = /^[a-f0-9]{24}\.(jpg|png|gif|webp)$/;

module.exports = function (ctx) {
  if (process.env.ENABLE_EXTRA === "false") return;
  const { io, jwt, secret } = ctx;
  const maxLen = ctx.maxLength || 250;
  const maxMsgs = ctx.maxChatListLeng || 20;

  // ---------- lưu trữ ----------
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const load = (file, def) => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
      return def;
    }
  };
  let prizes = load(PRIZE_FILE, {}); // { [id]: {id,name,stk,bank,time,gameCode} }
  let sessions = load(CHAT_FILE, {}); // { [sid]: {members:[a,b], msgs:[], unread:{id:n}, t} }

  const dirty = {};
  const writeNow = (file, obj) => {
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(obj));
    fs.renameSync(tmp, file);
  };
  const timers = {};
  const save = (file, getObj) => {
    dirty[file] = true;
    if (timers[file]) return;
    timers[file] = setTimeout(() => {
      timers[file] = null;
      try {
        if (dirty[file]) writeNow(file, getObj());
        dirty[file] = false;
      } catch (e) {
        console.error("[extra] save error", e);
      }
    }, 3000);
  };
  // tên ảnh -> sid, để kiểm tra quyền xem ảnh
  const imgIndex = new Map();
  const reindexImages = () => {
    imgIndex.clear();
    for (const sid in sessions)
      sessions[sid].msgs.forEach((m) => m.img && imgIndex.set(m.img, sid));
  };
  const dropImage = (name) => {
    imgIndex.delete(name);
    if (IMG_NAME_RE.test(name)) fs.unlink(path.join(UPLOAD_DIR, name), () => {});
  };
  reindexImages();
  const savePrizes = () => save(PRIZE_FILE, () => prizes);
  const saveChat = () => save(CHAT_FILE, () => sessions);
  process.on("exit", () => {
    try {
      if (dirty[PRIZE_FILE]) writeNow(PRIZE_FILE, prizes);
      if (dirty[CHAT_FILE]) writeNow(CHAT_FILE, sessions);
    } catch (e) {}
  });

  // ---------- tiện ích ----------
  const isAdminId = (id) =>
    id.toLowerCase() === "admin" || id.toLowerCase() === "brycenad9999";

  // Trả về {id,name,user} nếu token hợp lệ và khớp tài khoản trong data.json
  function auth(token) {
    if (!token || typeof token !== "string") return null;
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return null;
    }
    const list = ctx.userList() || [];
    const u = list.find((x) => x.id === decoded.id && x.pass === decoded.pass);
    if (!u) return null;
    return { id: u.id, name: u.name, user: u.user };
  }
  const findUser = (id) => (ctx.userList() || []).find((x) => x.id === id);
  const room = (id) => "u:" + id;
  const adminSockets = new Set();
  const donated = new Set();
  const escHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function totalUnread(id) {
    let n = 0;
    for (const sid in sessions) {
      const s = sessions[sid];
      if (s.members.includes(id)) n += s.unread[id] || 0;
    }
    return n;
  }
  function summary(sid, forId) {
    const s = sessions[sid];
    const peerId = s.members.find((m) => m !== forId);
    const peer = findUser(peerId) || { id: peerId, name: peerId };
    const last = s.msgs[s.msgs.length - 1];
    return {
      sid,
      peer: { id: peer.id, name: peer.name },
      last: last ? (last.img ? "[Ảnh]" : last.text) : "",
      t: s.t,
      unread: s.unread[forId] || 0,
    };
  }
  function userSessions(id) {
    return Object.keys(sessions)
      .filter((sid) => sessions[sid].members.includes(id))
      .filter((sid) => sessions[sid].msgs.length > 0 || sessions[sid].creator === id)
      .map((sid) => summary(sid, id))
      .sort((a, b) => b.t - a.t);
  }
  const cleanText = (s) =>
    String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

  // thêm tin vào phiên và emit trực tiếp cho 2 phía (không broadcast)
  function pushMessage(sid, fromId, fields) {
    const s = sessions[sid];
    const now = Date.now();
    const peerId = s.members.find((m) => m !== fromId);
    const msg = Object.assign({ from: fromId, t: now }, fields);
    s.msgs.push(msg);
    if (msg.img) imgIndex.set(msg.img, sid);
    while (s.msgs.length > maxMsgs) {
      const old = s.msgs.shift();
      if (old.img) dropImage(old.img);
    }
    s.t = now;
    // người nhận đang mở đúng phiên này sẽ gửi pm-open lại ngay nên unread tự về 0
    s.unread[peerId] = (s.unread[peerId] || 0) + 1;
    s.unread[fromId] = 0;
    saveChat();
    io.to(room(fromId)).emit("pm-message", { sid, msg, session: summary(sid, fromId), total: totalUnread(fromId) });
    io.to(room(peerId)).emit("pm-message", { sid, msg, session: summary(sid, peerId), total: totalUnread(peerId) });
  }

  // ---------- ảnh: upload qua HTTP, socket chỉ mang tên file ----------
  function sniffExt(b) {
    if (b.length < 12) return null;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
    if (b.slice(0, 4).toString("latin1") === "GIF8") return "gif";
    if (b.slice(0, 4).toString("latin1") === "RIFF" && b.slice(8, 12).toString("latin1") === "WEBP") return "webp";
    return null;
  }
  const lastUpload = new Map();
  if (ctx.app) {
    const raw = require("body-parser").raw({ type: () => true, limit: MAX_IMG_BYTES });
    ctx.app.post(
      "/pm-upload",
      function (req, res, next) {
        raw(req, res, function (err) {
          if (err) return res.status(413).json({ error: "Ảnh quá lớn (tối đa 5MB)." });
          next();
        });
      },
      function (req, res) {
        try {
          const u = auth(req.headers["x-token"]);
          const sid = req.headers["x-sid"];
          const s = u && sessions[sid];
          if (!s || !s.members.includes(u.id)) return res.status(403).json({ error: "Không có quyền." });
          const body = req.body;
          if (!Buffer.isBuffer(body) || body.length === 0 || body.length > MAX_IMG_BYTES)
            return res.status(400).json({ error: "Ảnh không hợp lệ hoặc quá 5MB." });
          const ext = sniffExt(body);
          if (!ext) return res.status(400).json({ error: "Chỉ hỗ trợ ảnh JPG, PNG, GIF, WebP." });
          const now = Date.now();
          if (now - (lastUpload.get(u.id) || 0) < MIN_UPLOAD_INTERVAL)
            return res.status(429).json({ error: "Bạn gửi ảnh quá nhanh, vui lòng chờ vài giây." });
          lastUpload.set(u.id, now);
          const name = require("crypto").randomBytes(12).toString("hex") + "." + ext;
          fs.writeFile(path.join(UPLOAD_DIR, name), body, function (err) {
            if (err) return res.status(500).json({ error: "Không lưu được ảnh." });
            pushMessage(sid, u.id, { text: "", img: name });
            res.json({ ok: true });
          });
        } catch (e) {
          console.error("[extra] pm-upload", e);
          res.status(500).json({ error: "Lỗi máy chủ." });
        }
      }
    );
    // xem ảnh: chỉ 2 người trong phiên chứa ảnh đó
    ctx.app.get("/pm-img/:name", function (req, res) {
      const u = auth(req.query.token);
      const name = req.params.name;
      const sid = IMG_NAME_RE.test(name) && imgIndex.get(name);
      if (!u || !sid || !sessions[sid] || !sessions[sid].members.includes(u.id)) return res.sendStatus(404);
      res.set("Cache-Control", "private, max-age=" + Math.floor(IMG_TTL_MS / 1000));
      res.sendFile(name, { root: UPLOAD_DIR }, function (err) {
        if (err && !res.headersSent) res.sendStatus(404);
      });
    });
  }

  // dọn ảnh quá 7 ngày: xóa file, đổi tin thành thông báo hết hạn; xóa file mồ côi theo thời gian sửa
  function cleanup() {
    try {
      const now = Date.now();
      let changed = false;
      for (const sid in sessions) {
        sessions[sid].msgs.forEach((m) => {
          if (m.img && now - m.t > IMG_TTL_MS) {
            dropImage(m.img);
            delete m.img;
            m.text = "[Ảnh đã hết hạn]";
            changed = true;
          }
        });
      }
      if (changed) saveChat();
      fs.readdir(UPLOAD_DIR, function (err, files) {
        if (err) return;
        files.forEach((f) => {
          const fp = path.join(UPLOAD_DIR, f);
          fs.stat(fp, (e, st) => {
            if (!e && now - st.mtimeMs > IMG_TTL_MS + 3600 * 1000) fs.unlink(fp, () => {});
          });
        });
      });
    } catch (e) {
      console.error("[extra] cleanup", e);
    }
  }
  cleanup();
  setInterval(cleanup, 3600 * 1000).unref();

  // ---------- socket ----------
  io.on("connection", function (client) {
    const rate = { last: 0 };
    let me = null; // tài khoản đã xác thực cho chat

    // ===== Nhận giải =====
    client.on("prize-submit", function (data) {
      try {
        const u = auth(data && data.token);
        if (!u) return client.emit("prize-error", "Vui lòng đăng nhập lại.");
        const stk = String((data && data.stk) || "").replace(/[\s.-]/g, "");
        const bank = cleanText((data && data.bank) || "");
        if (!/^\d{6,20}$/.test(stk))
          return client.emit("prize-error", "Số tài khoản không hợp lệ (6-20 chữ số).");
        if (bank.length < 2 || bank.length > 50)
          return client.emit("prize-error", "Tên ngân hàng không hợp lệ.");
        const rec = {
          id: u.id,
          name: u.name,
          stk,
          bank,
          time: Date.now(),
          gameCode: ctx.gameCode ? ctx.gameCode() : "",
        };
        prizes[u.id] = rec;
        savePrizes();
        client.emit("prize-submit-ok");
        adminSockets.forEach((s) => s.emit("prize-list", Object.values(prizes)));
      } catch (e) {
        console.error("[extra] prize-submit", e);
      }
    });

    // Ủng hộ giải cho lần sau: chỉ người đang trong danh sách trúng giải, mỗi lượt trúng 1 lần
    client.on("donate-prize", function (data) {
      try {
        const u = auth(data && data.token);
        if (!u) return client.emit("donate-error", "Vui lòng đăng nhập lại.");
        const w = (ctx.lstWinner() || []).find((x) => x.id === u.id);
        if (!w) return client.emit("donate-error", "Bạn không có trong danh sách trúng giải.");
        const key = u.id + "|" + w.index + "|" + w.time;
        if (donated.has(key)) return client.emit("donate-error", "Bạn đã ủng hộ rồi, cảm ơn bạn!");
        donated.add(key);
        const time = String((data && data.time) || "").slice(0, 12);
        ctx.postNotice(
          "Xin chân thành cảm ơn <b>" + escHtml(u.name) + "</b> đã trúng <b>Giải " + w.index +
            "</b> và quyết định <b><u>ủng hộ giải thưởng cho lần sau</u></b>! 💖 Chúc bạn luôn vui vẻ và may mắn! 🎉",
          time
        );
        client.emit("donate-ok");
      } catch (e) {
        console.error("[extra] donate-prize", e);
      }
    });

    client.on("prize-admin-get", function (token) {
      try {
        const u = auth(token);
        if (!u || !isAdminId(u.id)) return;
        adminSockets.add(client);
        client.emit("prize-list", Object.values(prizes));
      } catch (e) {
        console.error("[extra] prize-admin-get", e);
      }
    });

    // ===== Chat riêng =====
    client.on("pm-auth", function (token) {
      try {
        const u = auth(token);
        if (!u) return client.emit("pm-auth-error");
        me = u;
        client.join(room(u.id));
        client.emit("pm-init", {
          me: { id: u.id, name: u.name },
          sessions: userSessions(u.id),
          total: totalUnread(u.id),
        });
      } catch (e) {
        console.error("[extra] pm-auth", e);
      }
    });

    client.on("pm-create", function (targetId) {
      try {
        if (!me || typeof targetId !== "string") return;
        if (targetId === me.id || !findUser(targetId))
          return client.emit("pm-error", "Không tìm thấy nhân viên.");
        const sid = [me.id, targetId].sort().join("|");
        if (!sessions[sid]) {
          const mine = Object.keys(sessions).filter((k) =>
            sessions[k].members.includes(me.id)
          ).length;
          if (mine >= MAX_SESSIONS_PER_USER)
            return client.emit("pm-error", "Đã đạt số phiên trao đổi tối đa.");
          sessions[sid] = {
            members: [me.id, targetId],
            msgs: [],
            unread: {},
            t: Date.now(),
            creator: me.id,
          };
          saveChat();
        }
        client.emit("pm-session", summary(sid, me.id), true);
      } catch (e) {
        console.error("[extra] pm-create", e);
      }
    });

    client.on("pm-open", function (sid) {
      try {
        if (!me || !sessions[sid] || !sessions[sid].members.includes(me.id)) return;
        const s = sessions[sid];
        if (s.unread[me.id]) {
          s.unread[me.id] = 0;
          saveChat();
        }
        io.to(room(me.id)).emit("pm-history", { sid, msgs: s.msgs });
        io.to(room(me.id)).emit("pm-unread", { sid, unread: 0, total: totalUnread(me.id) });
      } catch (e) {
        console.error("[extra] pm-open", e);
      }
    });

    client.on("pm-send", function (data) {
      try {
        if (!me || !data) return;
        const s = sessions[data.sid];
        if (!s || !s.members.includes(me.id)) return;
        if (typeof data.text !== "string") return;
        const text = cleanText(data.text);
        if (!text || text.length > maxLen) return;
        const now = Date.now();
        if (now - rate.last < MIN_SEND_INTERVAL) return;
        rate.last = now;

        pushMessage(data.sid, me.id, { text });
      } catch (e) {
        console.error("[extra] pm-send", e);
      }
    });

    client.on("disconnect", function () {
      adminSockets.delete(client);
    });
  });
};
