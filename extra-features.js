// Chức năng bổ sung: Nhận giải (STK) + Chat riêng 1-1.
// Module độc lập, được server.js nạp trong try/catch. Đặt ENABLE_EXTRA=false để tắt.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data_private");
const PRIZE_FILE = path.join(DATA_DIR, "prizes.json");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");
const MAX_SESSIONS_PER_USER = 50;
const MIN_SEND_INTERVAL = 1000; // ms giữa 2 tin của cùng 1 người

module.exports = function (ctx) {
  if (process.env.ENABLE_EXTRA === "false") return;
  const { io, jwt, secret } = ctx;
  const maxLen = ctx.maxLength || 250;
  const maxMsgs = ctx.maxChatListLeng || 20;

  // ---------- lưu trữ ----------
  fs.mkdirSync(DATA_DIR, { recursive: true });
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
      last: last ? last.text : "",
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

        const peerId = s.members.find((m) => m !== me.id);
        const msg = { from: me.id, text, t: now };
        s.msgs.push(msg);
        if (s.msgs.length > maxMsgs) s.msgs.shift();
        s.t = now;
        // người nhận đang mở đúng phiên này sẽ gửi pm-open lại ngay nên unread tự về 0
        s.unread[peerId] = (s.unread[peerId] || 0) + 1;
        s.unread[me.id] = 0;
        saveChat();

        // emit trực tiếp 2 phía, không broadcast
        io.to(room(me.id)).emit("pm-message", { sid: data.sid, msg, session: summary(data.sid, me.id), total: totalUnread(me.id) });
        io.to(room(peerId)).emit("pm-message", { sid: data.sid, msg, session: summary(data.sid, peerId), total: totalUnread(peerId) });
      } catch (e) {
        console.error("[extra] pm-send", e);
      }
    });

    client.on("disconnect", function () {
      adminSockets.delete(client);
    });
  });
};
