// Trang admin: danh sách nhận giải (STK + ngân hàng). Không sửa client-admin.js.
(function () {
  if (typeof socket === "undefined") return;
  var prizes = [];
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(t) {
    var d = new Date(t), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + " " + p(d.getDate()) + "/" + p(d.getMonth() + 1);
  }
  function render() {
    var win = (typeof lstWinnerReverse !== "undefined" && lstWinnerReverse) || [];
    var rows = prizes.slice().sort(function (a, b) { return a.time - b.time; }).map(function (p, i) {
      var w = win.find(function (u) { return u.id == p.id; });
      var rank = w ? "Giải " + w.index : "";
      return "<p>" + (i + 1) + ". [" + fmt(p.time) + "] <span class=\"dataName\">" + esc(p.name) + "</span>" +
        (rank ? " <b>[" + rank + "]</b>" : "") +
        " – STK: <b>" + esc(p.stk) + "</b> – " + esc(p.bank) + "</p>";
    });
    $("#prizeList").html(rows.join("") || "<p>Chưa có ai gửi thông tin.</p>");
  }
  function request() {
    var t = sessionStorage.getItem("token");
    if (t) socket.emit("prize-admin-get", t);
  }
  socket.on("connect", request);
  socket.on("login-success", request);
  socket.on("prize-list", function (l) { prizes = l; render(); });
  socket.on("lstWinner", render); // cập nhật thứ tự giải khi danh sách thắng thay đổi
})();
