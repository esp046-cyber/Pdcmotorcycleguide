/* PDC Moto 2026 - Icon & Screenshot Generator
 * Renders favicon.svg onto HTML5 canvases and bundles every PNG the PWA needs
 * into one ZIP (store-only, no external libraries, works offline).
 *
 * Output (drop straight into the GitHub repo):
 *   icons/favicon-16x16.png, favicon-32x32.png
 *   icons/icon-72|96|128|144|152|192|384|512.png
 *   icons/icon-maskable-192.png, icon-maskable-512.png
 *   screenshots/screenshot-narrow.png (540x720), screenshot-wide.png (1280x720)
 *   + apple-touch-icon.png (180x180) and favicon.ico (16/32/48) at the root
 */
(function () {
  'use strict';

  var PDC = (window.PDC = window.PDC || {});

  var SVG_SOURCE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A3240"/><stop offset="1" stop-color="#171B22"/></linearGradient>' +
    '<linearGradient id="shell" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB84D"/><stop offset="1" stop-color="#F27F0C"/></linearGradient>' +
    '</defs>' +
    '<rect width="512" height="512" rx="112" fill="url(#bg)"/>' +
    '<path d="M96 352a160 160 0 0 1 320 0" fill="none" stroke="#3A4351" stroke-width="22" stroke-linecap="round"/>' +
    '<path d="M96 352a160 160 0 0 1 200-155" fill="none" stroke="#3DDC97" stroke-width="22" stroke-linecap="round"/>' +
    '<path fill="url(#shell)" d="M128 296c0-70 56-128 128-128 74 0 128 58 128 128v48c0 13-10 22-22 22H168c-22 0-40-18-40-40v-30Z"/>' +
    '<path fill="#171B22" d="M232 272h156v52H232c-14 0-26-12-26-26s12-26 26-26Z"/>' +
    '<path fill="#FFFFFF" fill-opacity=".18" d="M240 282h112l-14 12H240c-6 0-6-12 0-12Z"/>' +
    '<rect x="150" y="332" width="64" height="12" rx="6" fill="#171B22" fill-opacity=".55"/>' +
    '<path d="M168 232c24-30 56-46 96-46" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="12" stroke-linecap="round"/>' +
    '<circle cx="256" cy="392" r="14" fill="#FFA62B"/>' +
    '<path d="M256 392 330 318" stroke="#FFA62B" stroke-width="12" stroke-linecap="round"/>' +
    '</svg>';

  var BG_TOP = '#2A3240';
  var BG_BOTTOM = '#171B22';

  /* ---------------- helpers ---------------- */
  function svgToImage(svgText) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Could not load SVG')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    });
  }

  function loadSvgText() {
    return fetch('./favicon.svg', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('no svg'); return r.text(); })
      .catch(function () { return SVG_SOURCE; });
  }

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('toBlob failed')); }, 'image/png');
    });
  }

  function fillGradient(ctx, w, h) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, BG_TOP);
    g.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = g;
