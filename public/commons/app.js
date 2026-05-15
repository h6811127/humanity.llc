/**
 * Shared client utilities (profile page registers SW from inline script).
 */
(function () {
  if (typeof window === 'undefined') return;
  window.hcApiBase = function hcApiBase() {
    return `${window.location.origin}/.well-known/hc/v0.5`;
  };
})();
