// Trang chủ: nút Nhận giải + nút Chat(x). Không sửa client.js, chỉ lắng nghe thêm các sự kiện.
(function () {
  if (typeof socket === "undefined") return;
  var token = function () {
    try {
      return sessionStorage.getItem("token");
    } catch (e) {
      return null;
    }
  };
  var $prize = $("#btnPrize");
  var $chat = $("#btnPmChat");
  var myId = "";

  function setEnabled(on) {
    $prize.prop("disabled", !on);
    $chat.prop("disabled", !on);
    if (!on) $chat.text("Chat");
  }
  function setUnread(n) {
    $chat.text(n > 0 ? "Chat(" + n + ")" : "Chat");
  }

  // ----- đăng nhập / đăng xuất -----
  socket.on("login-success", function (userId) {
    myId = userId;
    setEnabled(true);
    socket.emit("pm-auth", token());
  });
  // kết nối lại (rớt mạng): đăng ký lại phòng chat riêng
  socket.on("reconnect", function () {
    if (myId && token()) socket.emit("pm-auth", token());
  });
  $("#btnLogout").on("click", function () {
    myId = "";
    setEnabled(false);
    try {
      localStorage.removeItem("pm_token");
    } catch (e) {}
  });

  // ----- chat -----
  socket.on("pm-init", function (d) {
    setUnread(d.total);
  });
  socket.on("pm-message", function (d) {
    setUnread(d.total);
  });
  socket.on("pm-unread", function (d) {
    setUnread(d.total);
  });
  $chat.on("click", function () {
    if (!myId) return;
    // mở tab mới, giữ nguyên tab game; chuyển token qua localStorage phòng khi sessionStorage không được sao chép
    try {
      localStorage.setItem("pm_token", token());
    } catch (e) {}
    window.open("chat.html", "bingoChat");
  });

  // ----- Report Bug to Admin: mở chat với admin ở tab mới -----
  $("#reportBug").on("click", function () {
    try {
      var t = token();
      if (t) localStorage.setItem("pm_token", t);
    } catch (e) {}
  });

  // ----- Ủng hộ giải cho lần sau (chỉ hiện với người trong danh sách trúng giải) -----
  var $donate = $("#btnDonate");
  function refreshDonate() {
    var win =
      myId &&
      typeof lstWinnerLocal !== "undefined" &&
      lstWinnerLocal &&
      lstWinnerLocal.some(function (u) {
        return u.id == myId;
      });
    $donate.toggleClass("hidden", !win);
  }
  socket.on("login-success", function () {
    setTimeout(refreshDonate, 300);
  });
  socket.on("lstWinner", function () {
    setTimeout(refreshDonate, 0); // chờ client.js cập nhật lstWinnerLocal
  });
  socket.on("restart", function () {
    setTimeout(refreshDonate, 500);
  });
  $("#btnLogout").on("click", function () {
    $donate.addClass("hidden");
  });
  $donate.on("click", function () {
    $("#donate-msg").text("");
    $("#donate-yes").prop("disabled", false);
    $("#modal-donate").addClass("show-modal");
  });
  $("#donate-no").on("click", function () {
    $("#modal-donate").removeClass("show-modal");
  });
  $("#donate-yes").on("click", function () {
    $(this).prop("disabled", true);
    socket.emit("donate-prize", {
      token: token(),
      time: typeof formatDate === "function" ? formatDate(new Date()) : "",
    });
  });
  socket.on("donate-ok", function () {
    $("#modal-donate").removeClass("show-modal");
  });
  socket.on("donate-error", function (msg) {
    $("#donate-msg").text(msg).css("color", "#c00");
    $("#donate-yes").prop("disabled", false);
  });

  // ----- nhận giải -----
  function showMsg(text, ok) {
    $("#prize-msg").text(text).css("color", ok ? "#080" : "#c00");
  }
  $prize.on("click", function () {
    if (!myId) return;
    showMsg("", true);
    var rank = "";
    if (typeof lstWinnerLocal !== "undefined" && lstWinnerLocal) {
      var w = lstWinnerLocal.find(function (u) {
        return u.id == myId;
      });
      if (w) rank = "Chúc mừng! Bạn trúng Giải " + w.index;
    }
    $("#prize-rank").text(rank);
    $("#modal-prize").addClass("show-modal");
  });
  $("#prize-close").on("click", function () {
    $("#modal-prize").removeClass("show-modal");
  });
  $("#prize-send").on("click", function () {
    var stk = $("#prize-stk").val().trim();
    var bank = $("#prize-bank").val().trim();
    if (!stk || !bank) return showMsg("Vui lòng nhập đủ STK và tên ngân hàng.", false);
    socket.emit("prize-submit", { token: token(), stk: stk, bank: bank });
  });
  socket.on("prize-submit-ok", function () {
    showMsg("Đã gửi stk cho BTC, vui lòng chờ Tin Tin nhé", true);
  });
  socket.on("prize-error", function (msg) {
    showMsg(msg, false);
  });
})();
