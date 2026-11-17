/* PDC Moto 2026 - Core application
 * Router, curriculum (Modules 1-6), T-CLOCS / BLOWBAGETS checklist, 300-sqm track simulator,
 * demerit tracker, 25-question mock exam, offline AI riding instructor, onboarding.
 * Educational guide only: always confirm current requirements with your LTO-accredited
 * driving school or the LTO.
 */
(function () {
  'use strict';

  var PDC = window.PDC;
  var V = PDC.voice;
  var store = PDC.store;
  var view = document.getElementById('view');

  /* ===================================================================== */
  /* Utilities                                                              */
  /* ===================================================================== */
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function reducedMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function icon(id, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }

  /* ===================================================================== */
  /* Persistent state                                                       */
  /* ===================================================================== */
  function getChecks() { return store.get('check', {}); }
  function setCheck(id, val) {
    var c = getChecks();
    if (val) c[id] = true; else delete c[id];
    store.set('check', c);
  }
  function getDone() { return store.get('modulesDone', {}); }
  function toggleDone(id) {
    var d = getDone();
    if (d[id]) delete d[id]; else d[id] = true;
    store.set('modulesDone', d);
    return !!d[id];
  }
  function getSim() { return store.get('simDone', {}); }
  function getDem() { return store.get('demerits', {}); }
  function getBest() { return store.get('quizBest', null); }

  /* ===================================================================== */
  /* CURRICULUM DATA                                                        */
  /* ===================================================================== */
  var MODULES = [
    { id: 1, key: 'm1', title: 'Pre-Driving Orientation & T-CLOCS', summary: 'Know the course, gear up, and inspect your bike the way instructors expect.', mins: 25 },
    { id: 2, key: 'm2', title: 'Motorcycle Types & Cockpit Controls', summary: 'Scooter, underbone and standard: what each hand and foot does.', mins: 30 },
    { id: 3, key: 'm3', title: 'Core Riding Maneuvers & Drills', summary: 'Moving off, friction zone, shifting, rev-matching and progressive braking.', mins: 45 },
