/* PDC Moto 2026 - Voice & AI Audio Engine
 * Dual engine:
 *   1) Google Cloud Text-to-Speech (Neural2 / Studio / Journey) with a user API key (localStorage)
 *   2) Browser Web Speech API fallback that prefers "Google" natural voices
 * Features: sticky mini-player, sentence highlighting, speed, skip +/-1 sentence,
 * Hands-Free Helmet Mode (auto-advance timer + voice commands), Media Session, wake lock.
 */
(function () {
  'use strict';

  var PDC = (window.PDC = window.PDC || {});
  var store = PDC.store;
  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------------ */
  /* Config (persisted)                                                  */
  /* ------------------------------------------------------------------ */
  var DEFAULT_VOICE = 'en-US-Journey-D';
  var EXTRA_VOICES = [
    ['en-US-Journey-F', 'English (US) – Journey F'],
    ['en-US-Studio-O', 'English (US) – Studio O'],
    ['en-US-Studio-Q', 'English (US) – Studio Q'],
    ['en-US-Neural2-D', 'English (US) – Neural2 D'],
    ['en-GB-Neural2-B', 'English (UK) – Neural2 B']
  ];

  var cfg = {
    rate: Number(store.get('rate', 1)) || 1,
    voice: store.get('voice', DEFAULT_VOICE),
    helmet: !!store.get('helmet', false),
    pauseSec: Number(store.get('pauseSec', 6)) || 6,
    engine: store.get('engine', 'auto'),            // 'auto' | 'browser'
    browserVoice: store.get('browserVoice', '')     // voiceURI
  };

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  var items = [];            // [{title, el, sentences:[], spans:[[span]]}]
  var ii = 0;                // item index
  var si = 0;                // sentence index
  var status = 'idle';       // idle | playing | paused | waiting
  var run = 0;               // invalidates stale callbacks
  var waitTimer = null;
  var waitLeft = 0;
  var pendingNext = false;   // paused while waiting for next step
  var googleDisabled = false;
  var activeEngine = 'browser';
  var lastEngineName = '';
  var currentUtterance = null;
  var highlighted = [];
  var audioEl = null;
  var cache = new Map();
  var cacheOrder = [];
  var wakeLock = null;

  /* ------------------------------------------------------------------ */
  /* Text utilities                                                      */
  /* ------------------------------------------------------------------ */
  var ABBREV = /(?:\be\.g|\bi\.e|\bvs|\bno|\bapprox|\betc|\bsec|\bft|\bMr|\bMs|\bDr|\bSt|\bNo)$/i;

  /* Returns [{start, end}] ranges over the RAW string (no normalisation). */
  function splitRanges(text) {
    var out = [];
    var start = 0;
    var n = text.length;
    var i = 0;
    while (i < n) {
      var c = text.charAt(i);
      if (c === '.' || c === '!' || c === '?' || c === '\n') {
        var j = i + 1;
        while (j < n && /["'”’)\]]/.test(text.charAt(j))) j++;
        var k = j;
        while (k < n && /\s/.test(text.charAt(k))) k++;
        var nextCh = text.charAt(k);
        var boundary = (k >= n) || (c === '\n') ||
