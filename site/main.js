(function () {
  var scene = document.getElementById("pass-scene");
  if (!scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var card = scene.querySelector(".pass-inner");
  if (!card) return;

  var maxY = 12;
  var maxX = 10;

  function setTilt(x, y) {
    card.style.transform =
      "rotateY(" + x * maxY + "deg) rotateX(" + -y * maxX + "deg) translateZ(0)";
    scene.classList.add("is-tilted");
  }

  function resetTilt() {
    scene.classList.remove("is-tilted");
    card.style.transform = "";
  }

  scene.addEventListener(
    "pointermove",
    function (e) {
      var rect = scene.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt(x, y);
    },
    { passive: true }
  );

  scene.addEventListener(
    "pointerdown",
    function (e) {
      scene.setPointerCapture(e.pointerId);
      var rect = scene.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt(x, y);
    },
    { passive: true }
  );

  scene.addEventListener("pointerup", resetTilt);
  scene.addEventListener("pointercancel", resetTilt);
  scene.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse") resetTilt();
  });
})();
