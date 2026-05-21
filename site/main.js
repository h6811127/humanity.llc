(function () {
  var scene = document.getElementById("pass-scene");
  var flip = document.getElementById("pass-flip");
  if (!scene || !flip) return;

  var inner = flip.querySelector(".pass-inner");
  var front = flip.querySelector(".pass-front");
  var back = flip.querySelector(".pass-back");
  if (!inner || !front || !back) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  var maxY = 12;
  var maxX = 10;
  var tapThreshold = 10;
  var flipDurationMs = 550;

  var isFlipped = false;
  var isTouching = false;
  var tiltEnabled = true;
  var startX = 0;
  var startY = 0;
  var moved = false;
  var activePointerId = null;
  var lastFlipAt = 0;

  function setTilt(x, y) {
    if (!tiltEnabled || isFlipped || flip.classList.contains("is-flipping")) return;
    flip.style.transform =
      "rotateY(" + x * maxY + "deg) rotateX(" + -y * maxX + "deg) translateZ(0)";
    scene.classList.add("is-tilted");
  }

  function resetTilt() {
    scene.classList.remove("is-tilted");
    scene.classList.remove("is-touching");
    isTouching = false;
    activePointerId = null;
    if (!isFlipped) {
      flip.style.transform = coarsePointer || reduceMotion ? "none" : "";
    }
  }

  function tiltFromClient(clientX, clientY) {
    var rect = scene.getBoundingClientRect();
    var x = (clientX - rect.left) / rect.width - 0.5;
    var y = (clientY - rect.top) / rect.height - 0.5;
    setTilt(x, y);
  }

  function noteMove(clientX, clientY) {
    if (Math.abs(clientX - startX) > tapThreshold || Math.abs(clientY - startY) > tapThreshold) {
      moved = true;
    }
  }

  function toggleFlip() {
    if (reduceMotion) return;
    var now = Date.now();
    if (now - lastFlipAt < flipDurationMs) return;
    lastFlipAt = now;

    flip.classList.add("is-flipping");
    tiltEnabled = false;
    flip.style.transform = "";

    isFlipped = !isFlipped;
    flip.classList.toggle("is-flipped", isFlipped);
    front.setAttribute("aria-hidden", isFlipped ? "true" : "false");
    back.setAttribute("aria-hidden", isFlipped ? "false" : "true");

    window.setTimeout(function () {
      flip.classList.remove("is-flipping");
      tiltEnabled = !isFlipped;
    }, flipDurationMs);
  }

  function onPress(clientX, clientY, pointerId) {
    if (flip.classList.contains("is-flipping")) return;
    startX = clientX;
    startY = clientY;
    moved = false;
    isTouching = true;
    activePointerId = pointerId;
    scene.classList.add("is-touching");
    tiltFromClient(clientX, clientY);
  }

  function onRelease(pointerType) {
    if (!moved && (pointerType === "touch" || pointerType === "pen" || coarsePointer)) {
      toggleFlip();
    }
    resetTilt();
  }

  function isLinkTarget(el) {
    return el && el.closest && el.closest("a");
  }

  scene.addEventListener(
    "pointerdown",
    function (e) {
      if (e.button !== 0 || isLinkTarget(e.target)) return;
      try {
        scene.setPointerCapture(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
      onPress(e.clientX, e.clientY, e.pointerId);
    },
    { passive: true }
  );

  scene.addEventListener(
    "pointermove",
    function (e) {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      if (!isTouching && e.pointerType !== "mouse") return;
      noteMove(e.clientX, e.clientY);
      tiltFromClient(e.clientX, e.clientY);
    },
    { passive: true }
  );

  function endPointer(e) {
    if (isLinkTarget(e.target)) {
      resetTilt();
      return;
    }
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    try {
      scene.releasePointerCapture(e.pointerId);
    } catch (_err) {
      /* ignore */
    }
    onRelease(e.pointerType);
  }

  scene.addEventListener("pointerup", endPointer);
  scene.addEventListener("pointercancel", endPointer);

  scene.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse" && !isTouching) resetTilt();
  });

  /* iOS backup: pointermove may not fire until capture; touchmove supplements tilt only */
  scene.addEventListener(
    "touchmove",
    function (e) {
      if (!isTouching || e.touches.length !== 1) return;
      var t = e.touches[0];
      noteMove(t.clientX, t.clientY);
      tiltFromClient(t.clientX, t.clientY);
    },
    { passive: true }
  );

  scene.addEventListener(
    "touchcancel",
    function () {
      resetTilt();
    },
    { passive: true }
  );

  /* Fine-pointer desktop: click without drag flips */
  scene.addEventListener("click", function (e) {
    if (coarsePointer || reduceMotion || isLinkTarget(e.target)) return;
    if (!moved) toggleFlip();
  });
})();
