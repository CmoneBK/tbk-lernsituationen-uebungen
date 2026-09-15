/* Wettkampf: mehrere Geräte, dieselben Aufgaben, um die Wette.
 *
 * Eingebunden wird der Baustein in jedem Training mit einer Zeile
 * unmittelbar vor dem schließenden body-Tag:
 *
 *     <script src="../../assets/wettkampf.js"></script>
 *
 * build/build.mjs trägt sie in neuen Trainings nach.
 *
 * Die Aufgabenfolge: immer im Browser
 * -----------------------------------
 * Ein Training würfelt seine Aufgaben. Würfelt es mit demselben Startwert,
 * kommt dieselbe Reihenfolge heraus - auf jedem Gerät. Genau das ist der
 * Code: fünf Zeichen, aus denen der Startwert entsteht. Wer ihn eingibt oder
 * den QR-Code abfotografiert, bekommt Aufgabe für Aufgabe dasselbe wie alle
 * anderen. Der Server weiß davon nichts und muss es auch nicht.
 *
 * Die Mitstreiter: mit Sammelstelle, wenn es sie gibt
 * --------------------------------------------------
 * Wo die API aus docs/WETTKAMPF-API.md antwortet, laufen alle in einer Runde:
 * Jedes Gerät meldet alle paar Sekunden seinen Stand und bekommt dafür die
 * Rangliste zurück. Wer vorn liegt, steht auf jedem Bildschirm.
 *
 * Anonym bleibt es trotzdem. Den Anzeigenamen vergibt die Sammelstelle aus
 * einer festen Liste („Falke", „Luchs"), es gibt kein Feld für einen Namen,
 * nichts wird auf dem Gerät gespeichert, und nach einem Tag löscht der Server
 * die Runde samt Ergebnissen.
 *
 * Ohne Sammelstelle: der Ergebniscode
 * -----------------------------------
 * Antwortet sie nicht - lokal geöffnet, auf GitHub Pages, oder das WLAN im
 * Raum streikt -, läuft derselbe Wettkampf ohne sie weiter. Dann zeigt jedes
 * Gerät am Ende einen Ergebniscode aus sechs Zeichen, in denen Treffer,
 * Rundenzahl und Zeit stecken, geprüft gegen den Wettkampfcode. Wer ihn
 * durchsagt oder am Anzeigegerät eintippt, steht im Punktestand; welche Zeile
 * zu wem gehört, weiß allein, wer sie abgegeben hat.
 *
 * Fälschungssicher ist dieser Code nicht: Wer das Prüfzeichen nachrechnet,
 * kann sich eines ausdenken - das Verfahren steht ja in dieser Datei. Es hält
 * Tippfehler und Codes aus der Runde davor heraus, mehr soll es nicht.
 *
 * Was ein Training mitbringen muss
 * --------------------------------
 *     window.TBK_WETTKAMPF = {
 *       neu: function(){ ... },   // Pflicht: Durchgang von vorn beginnen
 *       runden: 10,               // nur, wenn die Seite selbst keinen
 *                                 //   Durchgang mit Ende kennt
 *       ergebnisAn: 'ende'        // nur, wenn sie einen hat: die id ihres
 *     };                          //   eigenen Ergebnisblocks
 *
 * Mit "runden" zählt der Baustein mit. Dann meldet die Seite nach jeder
 * beantworteten Aufgabe eine Zeile:
 *
 *     document.dispatchEvent(new CustomEvent('tbk-runde',
 *       { detail: { richtig: true } }));
 *
 * Kennt die Seite ihren Durchgang selbst (Begriffstraining, Schnellcheck),
 * bleibt "runden" weg: Dann zählt und stoppt sie selbst, und sie sagt am
 * Ende einmal, wie es ausgegangen ist:
 *
 *     document.dispatchEvent(new CustomEvent('tbk-durchgang-ende',
 *       { detail: { richtig: 7, gesamt: 10 } }));
 *
 * Erst damit gibt es einen Ergebniscode. Über "ergebnisAn" landet er im
 * eigenen Ergebnisblock der Seite - dort, wohin sie ohnehin scrollt.
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
  var stand = [];                /* die eingetragenen Ergebnisse, ohne Netz */
  var ansicht = 'wettkampf';     /* wettkampf | punktestand */

  /* Mit Sammelstelle sieht jeder die anderen laufen; ohne sie tut es der
     Ergebniscode. Welcher Weg es wird, entscheidet die erste Antwort -
     gefragt wird nur, wenn ein Wettkampf beginnt. */
  var API = '/api/wettkampf.php';
  var TAKT = 4000;               /* so oft meldet ein laufendes Gerät */
  var netz = null;               /* null = noch nicht gefragt */
  var ich = null;                /* { nr, name, geheim } im Netzbetrieb */
  var rang = [];                 /* die Rangliste, wie der Server sie sortiert */
  var taktLauf = null;
  var hinweis = '';              /* was der Tafel gerade zu sagen ist */
  var letzterStand = null;       /* { treffer, gesamt, sek }, sobald fertig */

  /* ---------- Code und Startwert ---------- */

  function codeAusZahl(n, laenge) {
    var s = '';
    for (var i = 0; i < (laenge || LAENGE); i++) {
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
  function saeubern(roh, laenge) {
    var s = String(roh || '').toUpperCase(), aus = '';
    var hoechstens = laenge || LAENGE;
    for (var i = 0; i < s.length && aus.length < hoechstens; i++) {
      if (ZEICHEN.indexOf(s.charAt(i)) >= 0) aus += s.charAt(i);
    }
    return aus;
  }

  function neuerCode() {
    return codeAusZahl(Math.floor(echterZufall() * 32 * 32 * 32 * 32 * 32));
  }

  /* ---------- Die Sammelstelle ---------- */

  /* Ein Ruf, zwei Ausgänge. Was schiefgeht, geht leise schief: Die Aufgaben
     laufen im Browser, die Rangliste ist Beiwerk. Fällt sie aus, darf davon
     niemand etwas merken außer der Tafel.
     docs/WETTKAMPF-API.md beschreibt, was dort antworten soll. */
  function ruf(daten, gut, schief) {
    /* Lokal geöffnet gibt es keine Sammelstelle - gar nicht erst fragen. */
    if (location.protocol === 'file:' || typeof fetch !== 'function') {
      schief('kein netz');
      return;
    }
    var koerper = [];
    for (var k in daten) {
      if (daten.hasOwnProperty(k) && daten[k] !== '' && daten[k] !== null) {
        koerper.push(encodeURIComponent(k) + '=' + encodeURIComponent(daten[k]));
      }
    }
    var vorbei = false;
    var wecker = setTimeout(function () {
      if (!vorbei) { vorbei = true; schief('zeit'); }
    }, 6000);
    function fertigMit(f) {
      return function (x) {
        if (vorbei) return;
        vorbei = true;
        clearTimeout(wecker);
        f(x);
      };
    }
    fetch(API, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: koerper.join('&') })
      .then(function (a) { return a.json(); })
      .then(fertigMit(function (d) {
        if (d && d.ok) gut(d);
        else schief((d && d.error) || 'kaputt');
      }))
      .catch(fertigMit(function () { schief('netz'); }));
  }

  /* Meldet den eigenen Stand und bekommt dafür die Rangliste zurück - eine
     Anfrage für beides, das halbiert bei einer Klasse die Last. */
  function melden(fertig) {
    if (netz !== true || !ich || !code) return;
    /* Steht der Durchgang, gelten die Zahlen der Seite - der Baustein zählt
       ja nur dort mit, wo er die Runden führt. */
    var s = letzterStand;
    ruf({
      action: 'stand',
      code: code,
      geheim: ich.geheim,
      runde: s ? s.gesamt : runde,
      richtig: s ? s.treffer : richtig,
      gesamt: s ? s.gesamt : gesamtRunden(),
      dauer: s ? s.sek : Math.round((Date.now() - beginn) / 1000),
      fertig: fertig || s ? 1 : 0,
    }, function (d) {
      rang = (d.rang || []).filter(function (z) { return !z.weg; });
      tafelNachfuehren();
      streifenZeigen();
    }, function (e) {
      /* Zu viele Anfragen: Takt verdoppeln und weiterlaufen. Alles andere
         ist ein Grund, es beim Ergebniscode zu belassen. */
      if (e === 'rate limit') { TAKT = Math.min(TAKT * 2, 30000); taktSetzen(); return; }
      if (e === 'fremd' || e === 'unbekannt') { abschalten(); return; }
    });
  }

  function gesamtRunden() {
    if (typeof VERTRAG.runden === 'number') return VERTRAG.runden;
    return 0;                    /* weiß die Seite selbst, sagt sie am Ende */
  }

  function taktSetzen() {
    if (taktLauf) { clearInterval(taktLauf); taktLauf = null; }
    if (netz !== true || zustand === 'aus') return;
    /* Nach dem eigenen Ende langsamer: Dann schaut man nur noch zu, wie die
       anderen fertig werden. */
    taktLauf = setInterval(function () {
      melden(zustand === 'fertig');
    }, zustand === 'fertig' ? TAKT * 2 : TAKT);
  }

  /* Die Sammelstelle ist ausgefallen oder war nie da: zurück auf den
     Ergebniscode, ohne dass der Durchgang etwas davon merkt. */
  function abschalten() {
    netz = false;
    ich = null;
    rang = [];
    if (taktLauf) { clearInterval(taktLauf); taktLauf = null; }
    tafelNachfuehren();
  }

  function tafelNachfuehren() {
    if (!tafel.hidden) tafelBauen();
  }

  /* ---------- Der Ergebniscode ---------- */

  /* Am Ende bekommt jeder sechs Zeichen, in denen sein ganzes Ergebnis steckt:
     Treffer, Rundenzahl und Zeit. Wer sie am Anzeigegerät eintippt, steht im
     Punktestand - und niemand muss dafür seinen Namen sagen. Nur wer den Code
     abgegeben hat, weiß, welche Zeile seine ist.

     Sechs Zeichen zu je fünf Bit ergeben dreißig:

         Treffer 5 | Runden 5 | Sekunden 10 | Kennung 5 | Prüfzeichen 5

     Das Prüfzeichen hängt am Wettkampfcode. Damit fällt ein Zahlendreher auf,
     und ein Code aus der Runde davor lässt sich nicht einschmuggeln.

     Die Kennung unterscheidet zwei, die gleich gut und gleich schnell waren.
     Ohne sie bekämen beide denselben Code, und einer fiele aus der Liste -
     bei fünfundzwanzig Mitstreitern wäre das keine Seltenheit. Sie kommt aus
     dem echten Zufall, nicht aus dem des Wettkampfs: Der liefert auf allen
     Geräten dieselbe Zahl und würde genau nichts unterscheiden. */
  var ERG_LAENGE = 6;
  var ZAHL_KAPPE = 31;           /* Treffer und Runden passen in fünf Bit */
  var ZEIT_KAPPE = 1023;         /* gut siebzehn Minuten, in Sekunden */

  function pruefzeichen(nutz, basis) {
    var x = (nutz ^ basis) >>> 0;
    x = (x ^ x >>> 11) >>> 0;
    x = Math.imul(x, 0x45D9F3B) >>> 0;
    x = (x ^ x >>> 13) >>> 0;
    return x & 31;
  }

  function ergebniscode(treffer, gesamt, sek) {
    var t = Math.max(0, Math.min(ZAHL_KAPPE, Math.round(treffer)));
    var g = Math.max(0, Math.min(ZAHL_KAPPE, Math.round(gesamt)));
    var s = Math.max(0, Math.min(ZEIT_KAPPE, Math.round(sek)));
    var kennung = Math.floor(echterZufall() * 32) & 31;
    var nutz = (t << 20) | (g << 15) | (s << 5) | kennung;
    return codeAusZahl(nutz * 32 + pruefzeichen(nutz, zahlAusCode(code) || 0),
      ERG_LAENGE);
  }

  /* Umgekehrt: Was steckt in einem eingetippten Code - und gehört er hierher? */
  function ergebnisLesen(c) {
    var n = zahlAusCode(c);
    if (n === null) return null;
    var nutz = Math.floor(n / 32);
    if (n % 32 !== pruefzeichen(nutz, zahlAusCode(code) || 0)) return null;
    return {
      code: c,
      treffer: nutz >> 20 & 31,
      gesamt: nutz >> 15 & 31,
      sek: nutz >> 5 & 1023,
    };
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

    /* Der Punktestand: eine Rangliste aus Ergebniscodes, ohne einen Namen. */
    + '#wk-tafel .wk-rang{list-style:none;margin:10px 0 0;padding:0;'
      + 'counter-reset:wkplatz}'
    + '#wk-tafel .wk-rang li{counter-increment:wkplatz;display:flex;gap:8px;'
      + 'align-items:baseline;padding:7px 8px;border-radius:8px;'
      + 'font-size:.92rem;line-height:1.35}'
    + '#wk-tafel .wk-rang li:nth-child(odd){background:var(--bg,#f7f7f5)}'
    + ':root[data-thema-effektiv="dunkel"] #wk-tafel .wk-rang li:nth-child(odd)'
      + '{background:#151517}'
    + '#wk-tafel .wk-rang li::before{content:counter(wkplatz) ".";'
      + 'min-width:1.6em;font-weight:700;font-variant-numeric:tabular-nums}'
    + '#wk-tafel .wk-rang li.wk-sieg{background:rgba(180,83,9,.14);'
      + 'outline:1px solid #b45309}'
    + '#wk-tafel .wk-rang .wk-wer{font-family:ui-monospace,SFMono-Regular,Menlo,'
      + 'Consolas,monospace;font-weight:700;letter-spacing:.08em}'
    /* Im Netzbetrieb stehen dort Namen, keine Codes - die tragen sich als
       Schreibmaschinenschrift schlecht. */
    + '#wk-tafel .wk-namen .wk-wer{font-family:inherit;letter-spacing:0}'
    + '#wk-tafel .wk-rang .wk-lauf{font-size:.8rem;color:var(--muted,#5f5f5a)}'
    + ':root[data-thema-effektiv="dunkel"] #wk-tafel .wk-rang .wk-lauf'
      + '{color:#a0a0a0}'
    + '#wk-tafel .wk-rang .wk-zahl{margin-left:auto;white-space:nowrap;'
      + 'font-variant-numeric:tabular-nums}'
    + '#wk-tafel .wk-rang .wk-ich{font-size:.78rem;font-weight:700;'
      + 'padding:1px 7px;border-radius:999px;background:#b45309;color:#fff}'
    + '#wk-tafel .wk-sieger{margin:0 0 10px;padding:9px 12px;border-radius:10px;'
      + 'background:rgba(180,83,9,.14);color:inherit;font-size:.92rem}'
    + '#wk-tafel .wk-leise{font-size:.8rem}'

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
    + '#wk-ergebnis .wk-meins{display:inline-block;margin:2px 0 8px;'
      + 'padding:6px 14px;border-radius:10px;background:#b45309;color:#fff;'
      + 'font:700 26px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
      + 'letter-spacing:.14em;user-select:all}'
    + '#wk-ergebnis button{margin-top:4px;padding:9px 16px;border-radius:999px;'
      + 'border:0;font:inherit;font-weight:600;font-size:.9rem;cursor:pointer;'
      + 'background:var(--accent,#2b6cb0);color:#fff}'
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

  /* ---------- Der Punktestand ---------- */

  /* Gleich viele Treffer entscheidet die Zeit. Sind die Durchgänge
     verschieden lang - beim Begriffstraining lässt sich der Umfang
     einstellen -, zählt der Anteil, sonst stünde ein "7 von 20" hinter
     einem "7 von 10". */
  function rangfolge() {
    return stand.slice().sort(function (a, b) {
      var qa = a.gesamt ? a.treffer / a.gesamt : 0;
      var qb = b.gesamt ? b.treffer / b.gesamt : 0;
      if (qa !== qb) return qb - qa;
      return a.sek - b.sek;
    });
  }

  /* Trägt einen eingetippten Ergebniscode ein. Der Rückgabewert ist der
     Satz, der auf der Tafel stehen soll - leer, wenn alles gut ging. */
  function eintragen(roh) {
    var c = saeubern(roh, ERG_LAENGE);
    if (c.length !== ERG_LAENGE) return 'Ein Ergebniscode hat sechs Zeichen.';
    for (var i = 0; i < stand.length; i++) {
      if (stand[i].code === c) return 'Dieser Code steht schon im Punktestand.';
    }
    var e = ergebnisLesen(c);
    if (!e) return 'Dieser Code gehört nicht zu Wettkampf ' + code + '.';
    stand.push(e);
    return '';
  }

  /* Die Rangliste aus der Sammelstelle: Namen statt Codes, und sie zeigt
     auch, wer noch mittendrin ist. */
  function ranglisteBauen(wohin) {
    if (!rang.length) {
      el('p', { text: 'Noch niemand da. Wer den Code eingibt oder den QR-Code '
        + 'abfotografiert, erscheint hier von selbst.' }, wohin);
      return;
    }
    var fertige = rang.filter(function (z) { return z.fertig; });
    if (fertige.length > 1) {
      el('p', { 'class': 'wk-sieger',
        html: '<b>Vorn: ' + fertige[0].name + '</b> &ndash; ' + fertige[0].richtig
          + ' von ' + fertige[0].gesamt + ' in ' + zeitText(fertige[0].dauer * 1000) },
        wohin);
    }
    var liste = el('ol', { 'class': 'wk-rang wk-namen' }, wohin);
    rang.forEach(function (z, i) {
      var li = el('li', { 'class': i === 0 && z.fertig && rang.length > 1
        ? 'wk-sieg' : '' }, liste);
      el('span', { 'class': 'wk-wer', text: z.name }, li);
      if (ich && z.nr === ich.nr) el('span', { 'class': 'wk-ich', text: 'du' }, li);
      if (z.fertig) {
        el('span', { 'class': 'wk-zahl', text: z.richtig + '/' + z.gesamt
          + ' · ' + zeitText(z.dauer * 1000) }, li);
      } else {
        el('span', { 'class': 'wk-zahl wk-lauf', text: z.gesamt
          ? 'Runde ' + Math.min(z.runde + 1, z.gesamt) + ' von ' + z.gesamt
          : 'läuft noch' }, li);
      }
    });
    el('p', { 'class': 'wk-leise', text: 'Kein Name, keine Anmeldung: Die '
      + 'Namen vergibt der Wettkampf selbst und vergisst sie nach einem Tag '
      + 'wieder.' }, wohin);
  }

  function punktestandBauen() {
    el('h2', { text: 'Punktestand' }, tafel);
    var reihe = rangfolge();

    if (reihe.length > 1) {
      el('p', { 'class': 'wk-sieger',
        html: '<b>Sieger: ' + reihe[0].code + '</b> &ndash; ' + reihe[0].treffer
          + ' von ' + reihe[0].gesamt + ' in ' + zeitText(reihe[0].sek * 1000) }, tafel);
    }

    el('label', { 'for': 'wk-eingabe', text: 'Ergebniscode eintragen' }, tafel);
    var eing = el('input', { id: 'wk-eingabe', type: 'text', maxlength: '8',
      autocomplete: 'off', spellcheck: 'false', placeholder: 'z. B. 4RQ2MH' }, tafel);
    var kn = el('div', { 'class': 'wk-knoepfe' }, tafel);
    var ein = el('button', { type: 'button', text: 'Eintragen' }, kn);
    var sagt = el('p', { role: 'status', 'aria-live': 'polite' }, tafel);
    function los() {
      var satz = eintragen(eing.value);
      if (satz) { sagt.textContent = satz; return; }
      tafelBauen();
      var neu = document.getElementById('wk-eingabe');
      if (neu) neu.focus();
    }
    ein.addEventListener('click', los);
    eing.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); los(); }
    });

    if (!reihe.length) {
      el('p', { text: 'Noch niemand eingetragen. Jedes Gerät zeigt am Ende '
        + 'seines Durchgangs einen Ergebniscode - hier kommen sie zusammen.' }, tafel);
    } else {
      var liste = el('ol', { 'class': 'wk-rang' }, tafel);
      reihe.forEach(function (e, i) {
        var li = el('li', { 'class': i === 0 && reihe.length > 1 ? 'wk-sieg' : '' }, liste);
        el('span', { 'class': 'wk-wer', text: e.code }, li);
        if (e.ich) el('span', { 'class': 'wk-ich', text: 'du' }, li);
        el('span', { 'class': 'wk-zahl', text: e.treffer + '/' + e.gesamt
          + ' · ' + zeitText(e.sek * 1000) }, li);
      });
      el('p', { 'class': 'wk-leise', text: 'Kein Name, keine Anmeldung: Hier steht '
        + 'nur der Ergebniscode. Wessen Zeile welche ist, weiß nur, wer ihn '
        + 'abgegeben hat.' }, tafel);
    }

    var zurueck = el('button', { type: 'button', 'class': 'leise',
      text: 'Zurück zum Wettkampf' }, el('div', { 'class': 'wk-knoepfe' }, tafel));
    zurueck.addEventListener('click', function () {
      ansicht = 'wettkampf';
      tafelBauen();
    });
    eing.focus();
  }

  /* ---------- Die Tafel ---------- */

  function tafelBauen() {
    tafel.textContent = '';
    if (zustand !== 'aus' && ansicht === 'punktestand' && netz !== true) {
      return punktestandBauen();
    }
    if (zustand === 'aus') {
      el('h2', { text: 'Um die Wette' }, tafel);
      el('p', { text: 'Alle mit demselben Code bekommen dieselben Aufgaben in '
        + 'derselben Reihenfolge. Wer schneller und genauer ist, gewinnt. Ohne '
        + 'Anmeldung, ohne Konto.' }, tafel);
      var start = el('button', { type: 'button', text: 'Wettkampf starten' }, tafel);
      start.addEventListener('click', aufmachen);

      el('hr', { 'class': 'wk-trenner' }, tafel);
      el('label', { 'for': 'wk-eingabe', text: 'Oder einen Code mitmachen' }, tafel);
      var eing = el('input', { id: 'wk-eingabe', type: 'text', maxlength: '7',
        autocomplete: 'off', spellcheck: 'false', placeholder: 'z. B. K7M2Q' }, tafel);
      var knoepfe = el('div', { 'class': 'wk-knoepfe' }, tafel);
      var mit = el('button', { type: 'button', text: 'Mitmachen' }, knoepfe);
      var sagt = el('p', { role: 'status', 'aria-live': 'polite', text: hinweis }, tafel);
      function mitmachen() {
        var c = saeubern(eing.value);
        if (c.length !== LAENGE) {
          sagt.textContent = 'Der Code hat fünf Zeichen.';
          return;
        }
        sagt.textContent = 'Einen Augenblick …';
        beitreten(c);
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
      + (netz === true ? ' Wer mitmacht, erscheint unten von selbst.'
        : eigenerDurchgang() ? '' : ' Zeit und Trefferzahl stehen am Ende des '
          + 'Durchgangs - dort wird verglichen.') }, tafel);
    qrBauen(tafel, adresse(code));
    if (hinweis) el('p', { 'class': 'wk-sieger', text: hinweis }, tafel);

    /* Mit Sammelstelle steht die Rangliste gleich hier und führt sich selbst
       nach - ein zweiter Knopf dafür wäre nur ein Umweg. */
    if (netz === true) ranglisteBauen(tafel);

    var kn = el('div', { 'class': 'wk-knoepfe' }, tafel);
    if (netz !== true) {
      var stehen = el('button', { type: 'button',
        text: stand.length ? 'Punktestand (' + stand.length + ')' : 'Punktestand' }, kn);
      stehen.addEventListener('click', function () {
        ansicht = 'punktestand';
        tafelBauen();
      });
    }
    var neu = el('button', { type: 'button', 'class': 'leise', text: 'Noch einmal' }, kn);
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

  /* Wo steht man gerade? Im Netzbetrieb lässt sich das sagen. */
  function platzText() {
    if (netz !== true || !ich || !rang.length) return '';
    for (var i = 0; i < rang.length; i++) {
      if (rang[i].nr === ich.nr) {
        return 'Platz ' + (i + 1) + ' von ' + rang.length;
      }
    }
    return '';
  }

  function streifenZeigen() {
    if (zustand !== 'laeuft' || !eigenerDurchgang()) return;
    var s = streifen();
    var platz = platzText();
    s.innerHTML = '<span>Wettkampf <b>' + code + '</b></span>'
      + '<span>Runde ' + Math.min(runde + 1, VERTRAG.runden)
        + ' von ' + VERTRAG.runden + '</span>'
      + '<span class="wk-uhr">' + zeitText(Date.now() - beginn) + '</span>'
      + (platz ? '<span class="wk-uhr">' + platz + '</span>' : '')
      + '<span class="wk-hin">'
      + (netz === true
        ? 'Du bist ' + ich.name + '. Die anderen stehen unter „Wettkampf“.'
        : 'Alle mit diesem Code haben dieselben Aufgaben.')
      + '</span>';
  }

  /* Das eigene Ergebnis ins Bild - und in den Punktestand. Der eigene Code
     steht groß da: Er ist alles, was jemand weitergeben muss. */
  function ergebnisZeigen(treffer, gesamt, sek) {
    var alt = document.getElementById('wk-ergebnis');
    if (alt) alt.remove();

    var e = el('div', { id: 'wk-ergebnis', role: 'status', 'data-druck': 'weg' });
    el('p', { 'class': 'wk-gross', text: treffer + ' von ' + gesamt
      + ' richtig, in ' + zeitText(sek * 1000) }, e);

    if (netz === true) {
      /* Mit Sammelstelle braucht niemand etwas abzutippen: Die anderen
         stehen schon in der Tafel, und der eigene Platz auch. */
      el('p', { html: 'Du bist <b>' + (ich ? ich.name : '?') + '</b> im '
        + 'Wettkampf <b>' + code + '</b>. Wo du stehst, sagt die Tafel - sie '
        + 'führt sich nach, solange noch jemand spielt.' }, e);
    } else {
      var meins = ergebniscode(treffer, gesamt, sek);
      /* Nur einmal eintragen - auch wenn dieselbe Runde zweimal endet oder
         jemand denselben Code vorher schon eingetippt hat. */
      stand = stand.filter(function (x) { return !x.ich && x.code !== meins; });
      var eigen = ergebnisLesen(meins);
      if (eigen) { eigen.ich = true; stand.push(eigen); }
      el('p', { html: 'Dein Ergebniscode im Wettkampf <b>' + code + '</b>:' }, e);
      el('span', { 'class': 'wk-meins', text: meins }, e);
      el('p', { text: 'Sag ihn durch oder tipp ihn am Anzeigegerät in den '
        + 'Punktestand. Dort steht kein Name - nur du weißt, welche Zeile deine '
        + 'ist.' }, e);
    }

    var knopfStand = el('button', { type: 'button',
      text: netz === true ? 'Rangliste öffnen' : 'Punktestand öffnen' }, e);
    knopfStand.addEventListener('click', function () {
      ansicht = netz === true ? 'wettkampf' : 'punktestand';
      tafel.hidden = false;
      knopf.setAttribute('aria-expanded', 'true');
      tafelBauen();
    });

    /* Wo die Seite ihren eigenen Ergebnisblock hat, gehört der Code dort
       hinein - sonst stünde er oben, während alle unten hinsehen. */
    var eigenesEnde = VERTRAG.ergebnisAn
      && document.getElementById(VERTRAG.ergebnisAn);
    if (eigenesEnde) {
      eigenesEnde.insertBefore(e, eigenesEnde.firstChild);
      return;                    /* die Seite scrollt selbst dorthin */
    }
    var s = document.getElementById('wk-streifen');
    if (s) s.parentNode.insertBefore(e, s);
    else {
      var ziel = document.querySelector('main .box') || document.querySelector('main');
      if (ziel && ziel.parentNode) ziel.parentNode.insertBefore(e, ziel);
    }
    e.scrollIntoView({ block: 'center' });
  }

  /* ---------- Ablauf ---------- */

  /* Eine Runde aufmachen. Den Code vergibt die Sammelstelle, damit nicht
     zwei Lerngruppen gleichzeitig denselben ziehen. Ist sie nicht da,
     würfeln wir ihn selbst - dann läuft der Wettkampf über Ergebniscodes. */
  function aufmachen() {
    hinweis = 'Einen Augenblick …';
    tafelNachfuehren();
    ruf({ action: 'neu', pfad: location.pathname,
      titel: document.title.slice(0, 200),
      runden: typeof VERTRAG.runden === 'number' ? VERTRAG.runden : '' },
    function (d) {
      netz = true;
      ich = { nr: d.nr, name: d.name, geheim: d.geheim };
      hinweis = '';
      beginnen(d.code);
    },
    function () {
      abschalten();
      beginnen(neuerCode());
    });
  }

  /* Einen Code mitmachen. Nur wenn die Sammelstelle ausdrücklich sagt, dass
     es die Runde nicht gibt, hat der Code wirklich nicht gestimmt. Kommt gar
     keine Antwort, beginnen wir ihn eben ohne sie - die Aufgabenfolge hängt
     ja nur am Code. */
  function beitreten(c) {
    ruf({ action: 'beitreten', code: c, pfad: location.pathname },
      function (d) {
        netz = true;
        ich = { nr: d.nr, name: d.name, geheim: d.geheim };
        hinweis = d.pfad && d.pfad !== location.pathname
          ? 'Achtung: Dieser Wettkampf gehört zu einem anderen Training ('
            + (d.titel || d.pfad) + ').'
          : '';
        beginnen(c);
      },
      function (e) {
        if (e === 'unbekannt') {
          hinweis = 'Diesen Wettkampf gibt es nicht mehr. Eine Runde wird nach '
            + 'einem Tag gelöscht.';
          tafelNachfuehren();
          return;
        }
        if (e === 'voll') {
          hinweis = 'Dieser Wettkampf ist voll.';
          tafelNachfuehren();
          return;
        }
        abschalten();
        beginnen(c);
      });
  }

  function beginnen(c) {
    /* Ein neuer Wettkampf macht den alten Punktestand ungültig - dessen
       Ergebniscodes gehören zu einem anderen Code. Dieselbe Runde noch
       einmal lässt die eingetragenen Mitstreiter stehen. */
    if (c !== code) stand = [];
    else stand = stand.filter(function (x) { return !x.ich; });
    code = c;
    zustand = 'laeuft';
    ansicht = 'wettkampf';
    runde = 0;
    richtig = 0;
    letzterStand = null;
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

    /* Gleich einmal melden: Dann steht man sofort in der Liste der anderen,
       und die eigene ist auch nicht leer. */
    rang = [];
    melden(false);
    taktSetzen();

    tafelBauen();
    knopf.innerHTML = '<span aria-hidden="true">⚔</span> ' + code;
  }

  function beenden(treffer, gesamt) {
    zustand = 'fertig';
    if (uhrLauf) { clearInterval(uhrLauf); uhrLauf = null; }
    var s = document.getElementById('wk-streifen');
    if (s) s.remove();
    /* Die Zahlen der Seite gelten - der Baustein zählt nur mit, wo er darf. */
    letzterStand = { treffer: treffer, gesamt: gesamt,
      sek: Math.round((Date.now() - beginn) / 1000) };
    melden(true);
    taktSetzen();
    ergebnisZeigen(treffer, gesamt, letzterStand.sek);
    tafelBauen();
  }

  function aufhoeren() {
    zustand = 'aus';
    code = null;
    stand = [];
    rang = [];
    ich = null;
    netz = null;
    hinweis = '';
    letzterStand = null;
    ansicht = 'wettkampf';
    Math.random = echterZufall;
    if (taktLauf) { clearInterval(taktLauf); taktLauf = null; }
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
    if (zustand !== 'laeuft') return;
    runde++;
    if (e && e.detail && e.detail.richtig) richtig++;
    if (eigenerDurchgang() && runde >= VERTRAG.runden) { beenden(richtig, runde); return; }
    streifenZeigen();
    /* Damit die anderen den Fortschritt gleich sehen - und weil diese Meldung
       den Takt neu setzt, kommt gleich danach keine zweite hinterher. */
    melden(false);
    taktSetzen();
  });

  /* Wer seinen Durchgang selbst führt, sagt am Ende, wie er ausgegangen ist -
     erst damit gibt es einen Ergebniscode und einen Platz im Punktestand. */
  document.addEventListener('tbk-durchgang-ende', function (e) {
    if (zustand !== 'laeuft') return;
    var d = (e && e.detail) || {};
    beenden(Number(d.richtig) || 0, Number(d.gesamt) || 0);
  });

  /* Kommt jemand über den QR-Code, steht der Wettkampf schon in der Adresse. */
  var ausAdresse = /(?:^|[#&])w=([0-9A-Z]+)/i.exec(location.hash || '');
  if (ausAdresse) {
    var c0 = saeubern(ausAdresse[1]);
    if (c0.length === LAENGE) beitreten(c0);
  }
}());
