/** Inline bootstrap: honor `localStorage.hc_theme` before first paint (shell parity). */
export const SCAN_PAGE_THEME_BOOTSTRAP = `<script>
(function () {
  try {
    if (localStorage.getItem("hc_theme") === "dark") {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute("content", "#000000");
    }
  } catch (e) {}
})();
</script>`;
