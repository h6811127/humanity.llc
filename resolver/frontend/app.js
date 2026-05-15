/**
 * Tech Spec v0.5 §5.3 — shared client entry (profile pages load this too).
 */
(function () {
  if (typeof window === 'undefined') return;
  window.hcApiBase = function hcApiBase() {
    return `${window.location.origin}/.well-known/hc/v0.5`;
  };
})();
