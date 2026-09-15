/* Wettkampf: mehrere Geräte, dieselben Aufgaben, um die Wette.
 *
 * Eingebunden wird der Baustein in jedem Training mit einer Zeile
 * unmittelbar vor dem schließenden body-Tag:
 *
 *     <script src="../../assets/wettkampf.js"></script>
 *
 * build/build.mjs trägt sie in neuen Trainings nach.
 *
 * Wie es funktioniert - und warum ohne Server
 * ------------------------------------------
 * Ein Training würfelt seine Aufgaben. Würfelt es mit demselben Startwert,
 * kommt dieselbe Reihenfolge heraus - auf jedem Gerät. Genau das ist der
 * Code: fünf Zeichen, aus denen der Startwert entsteht. Wer ihn eingibt oder
 * den QR-Code abfotografiert, bekommt Aufgabe für Aufgabe dasselbe wie alle
 * anderen und kann sich damit messen.
 *
 * Das braucht keine Anmeldung, keinen Account, keinen Server und keine
 * Datenübertragung - es läuft auch dann, wenn nur die Seite geladen ist.
 * Was es deshalb nicht kann: die Punkte der anderen auf dem eigenen Gerät
 * anzeigen. Dafür müssten die Geräte miteinander sprechen, und das ginge
 * nur über eine Sammelstelle. Verglichen wird hier also am Ende laut oder
 * am Beamer - jeder sieht seine Zeit und seine Trefferzahl.
 *
 * Was ein Training mitbringen muss
 * --------------------------------
 *     window.TBK_WETTKAMPF = {
 *       neu: function(){ ... },   // Pflicht: Durchgang von vorn beginnen
 *       runden: 10                // nur, wenn die Seite selbst keinen
 *     };                          // Durchgang mit Ende kennt
 *
 * und nach jeder beantworteten Aufgabe eine Zeile:
 *
 *     document.dispatchEvent(new CustomEvent('tbk-runde',
 *       { detail: { richtig: true } }));
 *
 * Kennt die Seite ihren Durchgang selbst (Begriffstraining, Schnellcheck),
 * bleibt "runden" weg: Dann zählt und stoppt sie selbst, und der Baustein
 * sorgt nur für denselben Startwert.
 */
(function () {
  'use strict';

  if (document.getElementById('wk-knopf')) return;

  /* Ohne Zusage der Seite gibt es nichts zu starten. */
  var VERTRAG = window.TBK_WETTKAMPF;
  if (!VERTRAG || typeof VERTRAG.neu !== 'function') return;

  /* Zeichen, die sich nicht verwechseln lassen: kein O gegen 0, kein I
     gegen 1. Fünf davon ergeben gut dreiunddreißig Millionen Codes - mehr
     als genug, um zwei Runden in derselben Klasse auseinanderzuhalten. */
  var ZEICHEN = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  var LAENGE = 5;

  var echterZufall = Math.random;
  var zustand = 'aus';           /* aus | laeuft | fertig */
  var code = null;
  var beginn = 0, uhrLauf = null;
  var runde = 0, richtig = 0;

  /* ---------- Code und Startwert ---------- */

  function codeAusZahl(n) {
    var s = '';
    for (var i = 0; i < LAENGE; i++) {
      s = ZEICHEN.charAt(n % 32) + s;
      n = Math.floor(n / 32);
    }
    return s;
  }

  function zahlAusCode(c) {
    var n = 0;
    for (var i = 0; i < c.length; i++) {
      var k = ZEICHEN.indexOf(c.charAt(i));
      if (k < 0) return null;
      n = n * 32 + k;
    }
    return n;
  }

  /* Alles, was nicht zum Zeichenvorrat gehört, fällt weg: Leerzeichen und
     Bindestriche beim Abtippen ebenso wie eine Null, die es hier nicht gibt.
     Bleiben am Ende nicht fünf Zeichen übrig, sagt die Tafel das. */
  function saeubern(roh) {
    var s = String(roh || '').toUpperCase(), aus = '';
    for (var i = 0; i < s.length && aus.length < LAENGE; i++) {
      if (ZEICHEN.indexOf(s.charAt(i)) >= 0) aus += s.charAt(i);
    }
    return aus;
  }

  function neuerCode() {
    return codeAusZahl(Math.floor(echterZufall() * 32 * 32 * 32 * 32 * 32));
  }

  /* Mulberry32 - klein, schnell und für Aufgabenreihenfolgen mehr als gut
     genug. Wichtig ist nur: derselbe Startwert, dieselbe Folge. */
  function wuerfel(start) {
    var a = start | 0;
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- Aussehen ---------- */

  var CSS = ''
    + '#wk-knopf{display:inline-flex;align-items:center;gap:8px;'
      + 'padding:11px 16px;border:0;border-radius:999px;cursor:pointer;'
      + 'font:600 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
      + 'color:#fff;background:#b45309;box-shadow:0 2px 10px rgba(0,0,0,.22)}'
    + '#wk-knopf:hover{filter:brightness(1.08)}'
    + '#wk-knopf:focus-visible{outline:2px solid #1a1a1a;outline-offset:2px}'
    + '#wk-tafel{position:fixed;right:16px;bottom:74px;z-index:2147483647;'
      + 'width:min(340px,calc(100vw - 32px));max-height:min(70vh,640px);'
      + 'overflow:auto;padding:16px 18px;border-radius:14px;'
      + 'border:1px solid var(--border,#e3e3df);background:var(--card,#fff);'
      + 'color:var(--fg,#1a1a1a);box-shadow:0 10px 40px rgba(0,0,0,.28);'
      + 'font-family:inherit}'
    + ':root[data-thema-effektiv="dunkel"] #wk-tafel{background:#1e1e21;'
      + 'border-color:#2c2c30;color:#ececec}'
    + '#wk-tafel h2{margin:0 0 6px;font-size:1rem;font-weight:700}'
    + '#wk-tafel p{margin:0 0 10px;font-size:.88rem;line-height:1.5;'
      + 'color:var(--muted,#5f5f5a)}'
    + ':root[data-thema-effektiv="dunkel"] #wk-tafel p{color:#a0a0a0}'
    + '#wk-tafel .wk-code{display:block;margin:0 0 10px;padding:10px 12px;'
      + 'border-radius:10px;background:var(--bg,#f7f7f5);text-align:center;'
      + 'font:700 30px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
      + 'letter-spacing:.14em}'
    + ':root[data-thema-effektiv="dunkel"] #wk-tafel .wk-code{background:#151517}'
    + '#wk-tafel .wk-qr{display:block;width:170px;margin:0 auto 10px}'
    + '#wk-tafel label{display:block;margin:0 0 4px;font-size:.85rem;font-weight:600}'
    + '#wk-tafel input{width:100%;box-sizing:border-box;padding:9px 10px;'
      + 'border:1px solid var(--border,#e3e3df);border-radius:8px;'
      + 'background:var(--bg,#fff);color:inherit;font:inherit;'
      + 'text-transform:uppercase;letter-spacing:.12em}'
    + ':root[data-thema-effektiv="dunkel"] #wk-tafel input{background:#151517;'
      + 'border-color:#2c2c30}'
    + '#wk-tafel .wk-knoepfe{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}'
    + '#wk-tafel button{padding:9px 16px;border-radius:999px;border:0;'
      + 'font:inherit;font-weight:600;font-size:.9rem;cursor:pointer;'
      + 'background:var(--accent,#2b6cb0);color:#fff}'
    + '#wk-tafel button.leise{background:transparent;color:inherit;'
      + 'border:1px solid var(--border-stark,#cbd5e1)}'
    + '#wk-tafel .wk-trenner{margin:14px 0 10px;border:0;border-top:1px solid '
      + 'var(--border,#e3e3df)}'

    /* Der Streifen im Inhalt: Er sagt, dass ein Wettkampf läuft, und wie weit. */
    + '#wk-streifen{margin:0 0 16px;padding:12px 16px;border-radius:12px;'
      + 'border:1px solid #b45309;background:rgba(180,83,9,.10);'
      + 'display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;'
      + 'font-size:15px}'
    + '#wk-streifen b{font-size:17px}'
    + '#wk-streifen .wk-uhr{font-variant-numeric:tabular-nums;font-weight:700}'
    + '#wk-streifen .wk-hin{flex:1 1 100%;font-size:13px;color:var(--muted,#5f5f5a)}'
    + '#wk-ergebnis{margin:0 0 16px;padding:16px 18px;border-radius:12px;'
      + 'border:1px solid #b45309;background:rgba(180,83,9,.10)}'
    + '#wk-ergebnis .wk-gross{font-size:22px;font-weight:700;margin:0 0 4px}'
    + '@media print{#wk-knopf,#wk-tafel,#wk-streifen{display:none!important}}';

  var stil = document.createElement('style');
  stil.id = 'wk-stil';
  stil.textContent = CSS;
  document.head.appendChild(stil);

  function el(name, attr, eltern) {
    var e = document.createElement(name);
    for (var k in attr) {
      if (!attr.hasOwnProperty(k)) continue;
      if (k === 'text') e.textContent = attr[k];
      else if (k === 'html') e.innerHTML = attr[k];
      else e.setAttribute(k, attr[k]);
    }
    if (eltern) eltern.appendChild(e);
    return e;
  }

  /* Dieselbe Leiste, in der schon "Training anpassen" und "Herunterladen"
     stehen - der Baukasten legt sie an, wer zuerst kommt. */
  function leiste() {
    var l = document.getElementById('tbk-leiste');
    if (!l) {
      l = document.createElement('div');
      l.id = 'tbk-leiste';
      l.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483646;'
        + 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px';
      document.body.appendChild(l);
    }
    return l;
  }

  var knopf = el('button', {
    type: 'button', id: 'wk-knopf', 'aria-expanded': 'false',
    html: '<span aria-hidden="true">⚔</span> Wettkampf',
  });
  leiste().appendChild(knopf);

  var tafel = el('div', { id: 'wk-tafel', role: 'dialog',
    'aria-label': 'Wettkampf', hidden: 'hidden' }, document.body);

  knopf.addEventListener('click', function () {
    var zu = tafel.hidden;
    tafel.hidden = !zu;
    knopf.setAttribute('aria-expanded', zu ? 'true' : 'false');
    if (zu) tafelBauen();
  });

  /* ---------- QR ---------- */

  function qrBauen(ziel, text) {
    if (typeof window.tbkQr !== 'function') return;
    var m;
    try { m = window.tbkQr(text); } catch (e) { return; }
    var n = m.length, rand = 3, gesamt = n + 2 * rand;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + gesamt + ' ' + gesamt);
    svg.setAttribute('class', 'wk-qr');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR-Code zum Mitmachen');
    svg.setAttribute('shape-rendering', 'crispEdges');
    var hell = document.createElementNS(NS, 'rect');
    hell.setAttribute('width', gesamt);
    hell.setAttribute('height', gesamt);
    hell.setAttribute('fill', '#fff');
    svg.appendChild(hell);
    var d = '';
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (m[y][x]) d += 'M' + (x + rand) + ',' + (y + rand) + 'h1v1h-1z';
      }
    }
    var pfad = document.createElementNS(NS, 'path');
    pfad.setAttribute('d', d);
    pfad.setAttribute('fill', '#000');
    svg.appendChild(pfad);
    ziel.appendChild(svg);
  }

  function adresse(c) {
    var u = new URL(location.href);
    u.hash = 'w=' + c;
    return u.href;
  }

  /* ---------- Die Tafel ---------- */

  function tafelBauen() {
    tafel.textContent = '';
    if (zustand === 'aus') {
      el('h2', { text: 'Um die Wette' }, tafel);
      el('p', { text: 'Alle mit demselben Code bekommen dieselben Aufgaben in '
        + 'derselben Reihenfolge. Wer schneller und genauer ist, gewinnt. Ohne '
        + 'Anmeldung, ohne Konto.' }, tafel);
      var start = el('button', { type: 'button', text: 'Wettkampf starten' }, tafel);
      start.addEventListener('click', function () { beginnen(neuerCode()); });

      el('hr', { 'class': 'wk-trenner' }, tafel);
      el('label', { 'for': 'wk-eingabe', text: 'Oder einen Code mitmachen' }, tafel);
      var eing = el('input', { id: 'wk-eingabe', type: 'text', maxlength: '7',
        autocomplete: 'off', spellcheck: 'false', placeholder: 'z. B. K7M2Q' }, tafel);
      var knoepfe = el('div', { 'class': 'wk-knoepfe' }, tafel);
      var mit = el('button', { type: 'button', text: 'Mitmachen' }, knoepfe);
      var fehler = el('p', { role: 'status', 'aria-live': 'polite' }, tafel);
      function mitmachen() {
        var c = saeubern(eing.value);
        if (c.length !== LAENGE) {
          fehler.textContent = 'Der Code hat fünf Zeichen.';
          return;
        }
        beginnen(c);
      }
      mit.addEventListener('click', mitmachen);
      eing.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); mitmachen(); }
      });
      eing.focus();
      return;
    }

    el('h2', { text: zustand === 'laeuft' ? 'Wettkampf läuft' : 'Wettkampf beendet' }, tafel);
    el('span', { 'class': 'wk-code', text: code }, tafel);
    el('p', { text: 'Wer diesen Code eingibt oder den Bildschirm abfotografiert, '
      + 'bekommt dieselben Aufgaben.'
      + (eigenerDurchgang() ? '' : ' Zeit und Trefferzahl stehen am Ende des '
        + 'Durchgangs - dort wird verglichen.') }, tafel);
    qrBauen(tafel, adresse(code));
    var kn = el('div', { 'class': 'wk-knoepfe' }, tafel);
    var neu = el('button', { type: 'button', text: 'Noch einmal' }, kn);
    neu.addEventListener('click', function () { beginnen(code); });
    var aus = el('button', { type: 'button', 'class': 'leise', text: 'Beenden' }, kn);
    aus.addEventListener('click', aufhoeren);
  }

  /* ---------- Streifen im Inhalt ---------- */

  function eigenerDurchgang() {
    return typeof VERTRAG.runden === 'number';
  }

  function streifen() {
    var s = document.getElementById('wk-streifen');
    if (s) return s;
    s = el('div', { id: 'wk-streifen', role: 'status', 'aria-live': 'polite',
      'data-druck': 'weg' });
    /* Über die erste Aufgabenkiste - dort schaut man ohnehin hin. */
    var ziel = document.querySelector('main .box') || document.querySelector('main');
    if (ziel && ziel.parentNode) ziel.parentNode.insertBefore(s, ziel);
    else document.body.insertBefore(s, document.body.firstChild);
    return s;
  }

  function zeitText(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }

  function streifenZeigen() {
    var s = streifen();
    var mitRunden = typeof VERTRAG.runden === 'number';
    s.innerHTML = '<span>Wettkampf <b>' + code + '</b></span>'
      + (mitRunden ? '<span>Runde ' + Math.min(runde + 1, VERTRAG.runden)
          + ' von ' + VERTRAG.runden + '</span>' : '')
      + '<span class="wk-uhr">' + zeitText(Date.now() - beginn) + '</span>'
      + '<span class="wk-hin">Alle mit diesem Code haben dieselben Aufgaben.</span>';
  }

  function ergebnisZeigen() {
    var alt = document.getElementById('wk-ergebnis');
    if (alt) alt.remove();
    var e = el('div', { id: 'wk-ergebnis', role: 'status', 'data-druck': 'weg' });
    var dauer = Date.now() - beginn;
    e.innerHTML = '<p class="wk-gross">' + richtig + ' von ' + runde
      + ' richtig, in ' + zeitText(dauer) + '</p>'
      + '<p>Wettkampf <b>' + code + '</b> &ndash; jetzt vergleichen. '
      + 'Über „Wettkampf“ unten rechts geht dieselbe Runde noch einmal.</p>';
    var s = document.getElementById('wk-streifen');
    if (s) s.parentNode.insertBefore(e, s);
    else {
      var ziel = document.querySelector('main .box') || document.querySelector('main');
      if (ziel && ziel.parentNode) ziel.parentNode.insertBefore(e, ziel);
    }
    e.scrollIntoView({ block: 'center' });
  }

  /* ---------- Ablauf ---------- */

  function beginnen(c) {
    code = c;
    zustand = 'laeuft';
    runde = 0;
    richtig = 0;
    var alt = document.getElementById('wk-ergebnis');
    if (alt) alt.remove();

    /* Von hier an würfelt die Seite mit dem Startwert aus dem Code. */
    Math.random = wuerfel(zahlAusCode(c) ^ 0x5bf03635);
    try { VERTRAG.neu(); } catch (e) { /* die Seite weiß es besser */ }

    beginn = Date.now();
    if (uhrLauf) clearInterval(uhrLauf);
    /* Nur wo die Seite keinen eigenen Durchgang kennt, laeuft hier eine Uhr
       und steht ein Streifen. Begriffstraining und Schnellcheck bringen
       beides selbst mit - zwei Uhren nebeneinander waeren nur verwirrend. */
    if (eigenerDurchgang()) {
      uhrLauf = setInterval(streifenZeigen, 500);
      streifenZeigen();
    }

    try { history.replaceState(null, '', adresse(c)); }
    catch (e) { location.hash = 'w=' + c; }

    tafelBauen();
    knopf.innerHTML = '<span aria-hidden="true">⚔</span> ' + code;
  }

  function beenden() {
    zustand = 'fertig';
    if (uhrLauf) { clearInterval(uhrLauf); uhrLauf = null; }
    var s = document.getElementById('wk-streifen');
    if (s) s.remove();
    ergebnisZeigen();
    tafelBauen();
  }

  function aufhoeren() {
    zustand = 'aus';
    code = null;
    Math.random = echterZufall;
    if (uhrLauf) { clearInterval(uhrLauf); uhrLauf = null; }
    var s = document.getElementById('wk-streifen');
    if (s) s.remove();
    var e = document.getElementById('wk-ergebnis');
    if (e) e.remove();
    try { history.replaceState(null, '', location.pathname + location.search); }
    catch (err) { /* egal */ }
    knopf.innerHTML = '<span aria-hidden="true">⚔</span> Wettkampf';
    tafelBauen();
  }

  /* Jede beantwortete Aufgabe meldet sich. Kennt die Seite ihren Durchgang
     selbst, zählen wir nur mit; sonst beenden wir nach der letzten Runde. */
  document.addEventListener('tbk-runde', function (e) {
    if (zustand !== 'laeuft' || !eigenerDurchgang()) return;
    runde++;
    if (e && e.detail && e.detail.richtig) richtig++;
    if (runde >= VERTRAG.runden) beenden();
    else streifenZeigen();
  });

  /* Kommt jemand über den QR-Code, steht der Wettkampf schon in der Adresse. */
  var ausAdresse = /(?:^|[#&])w=([0-9A-Z]+)/i.exec(location.hash || '');
  if (ausAdresse) {
    var c0 = saeubern(ausAdresse[1]);
    if (c0.length === LAENGE) beginnen(c0);
  }
}());
