// Hiệu ứng cánh hoa đào/mai rơi. Không ảnh hưởng thao tác (pointer-events: none).
(function () {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var box = document.createElement("div");
  box.id = "petals";
  box.setAttribute("aria-hidden", "true");
  var n = window.innerWidth < 768 ? 14 : 24;
  var r = function (a, b) { return a + Math.random() * (b - a); };
  for (var i = 0; i < n; i++) {
    var p = document.createElement("div");
    var size = r(8, 18);
    p.className = "petal" + (Math.random() < 0.3 ? " gold" : "");
    p.style.left = r(0, 100) + "%";
    p.style.width = size + "px";
    p.style.height = size * 0.8 + "px";
    p.style.animationDuration = r(9, 18) + "s";
    p.style.animationDelay = "-" + r(0, 18) + "s";
    p.style.setProperty("--sway", r(-80, 120) + "px");
    p.style.setProperty("--rot", r(240, 720) * (Math.random() < 0.5 ? -1 : 1) + "deg");
    p.style.setProperty("--op", r(0.55, 0.9).toFixed(2));
    box.appendChild(p);
  }
  document.body.appendChild(box);
  // dừng hoạt ảnh khi tab bị ẩn để đỡ tốn pin
  document.addEventListener("visibilitychange", function () {
    box.style.display = document.hidden ? "none" : "";
  });
})();
