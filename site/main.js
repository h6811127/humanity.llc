(function () {
  document.documentElement.classList.add("js");

  var yearEl = document.getElementById("y");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var reveals = document.querySelectorAll(".reveal-scroll");
  if (!reveals.length) return;

  if (!("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var isMobile = window.matchMedia("(max-width: 719px)").matches;
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: isMobile ? "0px 0px 0px 0px" : "0px 0px -5% 0px",
      threshold: isMobile ? 0.02 : 0.08,
    }
  );

  reveals.forEach(function (el) {
    observer.observe(el);
  });

  var scene = document.getElementById("card-scene");
  if (!scene) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(min-width: 720px) and (hover: hover) and (pointer: fine)").matches) {
    return;
  }

  scene.addEventListener(
    "pointermove",
    function (e) {
      var rect = scene.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      var card = scene.querySelector(".trust-card");
      if (!card) return;
      card.style.transform =
        "rotateY(" + x * 8 + "deg) rotateX(" + -y * 6 + "deg)";
      scene.classList.add("is-tilted");
    },
    { passive: true }
  );

  scene.addEventListener("pointerleave", function () {
    var card = scene.querySelector(".trust-card");
    scene.classList.remove("is-tilted");
    if (card) card.style.transform = "";
  });
})();
