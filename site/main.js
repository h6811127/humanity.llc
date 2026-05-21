(function () {
  /**
   * Card interaction (cross-browser):
   * - Flip: only #pass-flip-btn click (native button; iOS Safari, Chrome Android,
   *   Firefox mobile, Samsung Internet, desktop). Do not flip on pointerup/touchend.
   * - Tilt: drag on #pass-tilt-surface while front is visible; transform on
   *   #pass-tilt-wrap only — #pass-flip / .pass-inner handle 3D flip only.
   * - Links inside tilt surface do not start tilt; back-face links are outside tilt.
   * Manual test: tap "Tap to flip" flips on phone; drag card face tilts; reduced-motion
   * still flips instantly; back-face policy link opens without flipping.
   */
  var scene = document.getElementById("pass-scene");
  var tiltWrap = document.getElementById("pass-tilt-wrap");
  var flip = document.getElementById("pass-flip");
  var flipBtn = document.getElementById("pass-flip-btn");
  var tiltSurface = document.getElementById("pass-tilt-surface");
  if (!scene || !tiltWrap || !flip || !flipBtn || !tiltSurface) return;

  var inner = flip.querySelector(".pass-inner");
  var front = flip.querySelector(".pass-front");
  var back = flip.querySelector(".pass-back");
  if (!inner || !front || !back) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (reduceMotion) {
    flip.classList.add("reduce-motion");
  }

  var maxY = 12;
  var maxX = 10;
  var flipDurationMs = reduceMotion ? 0 : 550;

  var isFlipped = false;
  var isDragging = false;
  var tiltEnabled = true;
  var activePointerId = null;
  var lastFlipAt = 0;

  function setTilt(x, y) {
    if (!tiltEnabled || isFlipped || flip.classList.contains("is-flipping")) return;
    tiltWrap.style.transform =
      "rotateY(" + x * maxY + "deg) rotateX(" + -y * maxX + "deg) translateZ(0)";
    scene.classList.add("is-tilted");
  }

  function resetTilt() {
    scene.classList.remove("is-tilted");
    scene.classList.remove("is-touching");
    isDragging = false;
    activePointerId = null;
    if (!isFlipped) {
      tiltWrap.style.transform = coarsePointer || reduceMotion ? "none" : "";
    }
  }

  function tiltFromClient(clientX, clientY) {
    var rect = scene.getBoundingClientRect();
    var x = (clientX - rect.left) / rect.width - 0.5;
    var y = (clientY - rect.top) / rect.height - 0.5;
    setTilt(x, y);
  }

  function finishFlipTransition() {
    flip.classList.remove("is-flipping");
    tiltEnabled = !isFlipped;
  }

  function toggleFlip() {
    var now = Date.now();
    if (!reduceMotion && now - lastFlipAt < flipDurationMs) return;
    lastFlipAt = now;

    resetTilt();
    flip.classList.add("is-flipping");
    tiltEnabled = false;
    tiltWrap.style.transform = "";

    isFlipped = !isFlipped;
    flip.classList.toggle("is-flipped", isFlipped);
    front.setAttribute("aria-hidden", isFlipped ? "true" : "false");
    back.setAttribute("aria-hidden", isFlipped ? "false" : "true");
    flipBtn.textContent = isFlipped ? "Tap to show front" : "Tap to flip";

    if (reduceMotion) {
      finishFlipTransition();
    } else {
      window.setTimeout(finishFlipTransition, flipDurationMs);
    }
  }

  function isLinkTarget(el) {
    return el && el.closest && el.closest("a");
  }

  function onTiltPress(clientX, clientY, pointerId) {
    if (isFlipped || flip.classList.contains("is-flipping")) return;
    isDragging = true;
    activePointerId = pointerId;
    scene.classList.add("is-touching");
    tiltFromClient(clientX, clientY);
  }

  function onTiltMove(clientX, clientY) {
    if (!isDragging) return;
    tiltFromClient(clientX, clientY);
  }

  function onTiltRelease() {
    if (!isDragging) return;
    resetTilt();
  }

  flipBtn.addEventListener("click", function () {
    toggleFlip();
  });

  tiltSurface.addEventListener(
    "pointerdown",
    function (e) {
      if (e.button !== 0 || isLinkTarget(e.target)) return;
      if (e.pointerType === "mouse" && !coarsePointer) {
        try {
          tiltSurface.setPointerCapture(e.pointerId);
        } catch (_err) {
          /* ignore */
        }
      }
      onTiltPress(e.clientX, e.clientY, e.pointerId);
    },
    { passive: true }
  );

  tiltSurface.addEventListener(
    "pointermove",
    function (e) {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      onTiltMove(e.clientX, e.clientY);
    },
    { passive: true }
  );

  function endPointer(e) {
    if (!isDragging) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    if (e.pointerType === "mouse" && !coarsePointer) {
      try {
        tiltSurface.releasePointerCapture(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
    }
    onTiltRelease();
  }

  tiltSurface.addEventListener("pointerup", endPointer);
  tiltSurface.addEventListener("pointercancel", endPointer);

  tiltSurface.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse" && isDragging) onTiltRelease();
  });

  tiltSurface.addEventListener(
    "touchmove",
    function (e) {
      if (!isDragging || e.touches.length !== 1) return;
      var t = e.touches[0];
      onTiltMove(t.clientX, t.clientY);
    },
    { passive: true }
  );

  tiltSurface.addEventListener(
    "touchend",
    function () {
      onTiltRelease();
    },
    { passive: true }
  );

  tiltSurface.addEventListener(
    "touchcancel",
    function () {
      onTiltRelease();
    },
    { passive: true }
  );
})();
