/* PDC Moto 2026 - PWA handler
 * Loaded first. Creates the shared window.PDC namespace (storage, toast,
 * announcer, modals, theme) and handles service worker registration,
 * update prompt, install UI (Android/desktop + iOS guide) and connection badge.
 */
(function () {
  'use strict';

  var PDC = (window.PDC = window.PDC || {});

  /* ---------------- Storage (safe localStorage) ---------------- */
  PDC.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem('pdc.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('pdc.' + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem('pdc.' + key); } catch (e) { /* ignore */ }
    }
  };

  /* ---------------- Helpers ---------------- */
  function $(id) { return document.getElementById(id); }
  PDC.$ = $;

  PDC.isStandalone = function () {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  };
  PDC.isIOS = function () {
    var ua = navigator.userAgent || '';
    var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPad|iPhone|iPod/.test(ua) || iPadOS;
  };

  PDC.announce = function (message) {
    var el = $('sr-announcer');
    if (!el) return;
    el.textContent = '';
    window.setTimeout(function () { el.textContent = message; }, 40);
  };

  PDC.toast = function (message, type, ms) {
    var region = $('toast-region');
    if (!region) return;
    var icons = { pass: '✅', warn: '⚠️', danger: '⛔', info: 'ℹ️' };
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast--' + type : '');
    var ic = document.createElement('span');
    ic.setAttribute('aria-hidden', 'true');
    ic.textContent = icons[type || 'info'] || icons.info;
    var tx = document.createElement('span');
    tx.textContent = message;
    t.appendChild(ic);
    t.appendChild(tx);
    region.appendChild(t);
    while (region.children.length > 3) region.removeChild(region.firstChild);
    window.setTimeout(function () {
      t.classList.add('is-leaving');
      window.setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, ms || 3600);
  };

  if (navigator.vibrate) {
    PDC.haptic = function (pattern) {
      try { navigator.vibrate(pattern || 12); } catch (e) { /* ignore */ }
    };
  } else {
    PDC.haptic = function () {};
  }

  /* ---------------- Modals (focus trap, Esc, backdrop) ---------------- */
  var modalTriggers = {};
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  PDC.openModal = function (id) {
    var m = $(id);
    if (!m) return;
    modalTriggers[id] = document.activeElement;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
