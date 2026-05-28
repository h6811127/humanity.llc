(function () {
  /**
   * Landing pass card  -  demo revoke animation (not connected to the network).
   */
  var surface = document.getElementById("pass-tilt-surface");
  var live = document.getElementById("pass-demo-live");
  var revoked = document.getElementById("pass-demo-revoked");
  var btn = document.getElementById("pass-demo-revoke-btn");
  var flip = document.getElementById("pass-flip");
  var meter = document.getElementById("pass-demo-meter");
  var meterCount = document.getElementById("pass-demo-meter-count");
  if (!surface || !live || !revoked || !btn) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isRevoked = false;

  function setMeter(scans) {
    if (!meter || !meterCount) return;
    var n = Math.min(3, Math.max(0, scans));
    meter.style.width = (n / 3) * 100 + "%";
    meterCount.textContent = n + " / 3";
  }

  function showLive() {
    isRevoked = false;
    surface.classList.remove("is-demo-revoked", "is-revoking");
    live.hidden = false;
    live.setAttribute("aria-hidden", "false");
    revoked.hidden = true;
    revoked.setAttribute("aria-hidden", "true");
    btn.textContent = "Revoke (demo)";
    btn.setAttribute("aria-pressed", "false");
    setMeter(0);
  }

  function showRevoked() {
    isRevoked = true;
    surface.classList.add("is-demo-revoked");
    live.hidden = true;
    live.setAttribute("aria-hidden", "true");
    revoked.hidden = false;
    revoked.setAttribute("aria-hidden", "false");
    btn.textContent = "Restore (demo)";
    btn.setAttribute("aria-pressed", "true");
    setMeter(0);
  }

  function playRevoke() {
    if (flip && flip.classList.contains("is-flipped")) return;
    if (reduceMotion) {
      showRevoked();
      return;
    }
    surface.classList.add("is-revoking");
    window.setTimeout(function () {
      surface.classList.remove("is-revoking");
      showRevoked();
    }, 520);
  }

  btn.addEventListener("click", function () {
    if (isRevoked) {
      if (reduceMotion) {
        showLive();
        return;
      }
      surface.classList.add("is-restoring");
      window.setTimeout(function () {
        surface.classList.remove("is-restoring");
        showLive();
      }, 400);
    } else {
      playRevoke();
    }
  });
})();
