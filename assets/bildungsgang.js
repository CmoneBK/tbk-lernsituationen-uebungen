/* Welcher Bildungsgang? Und was gehört dann dazu.
 *
 * Eingebunden vor den Bausteinen, die ihn nutzen:
 *
 *     <script src="../../assets/bildungsgang.js"></script>
 *     <script src="../../assets/baukasten.js"></script>
 *
 * Wozu: Dieselbe Übung passt nicht in jeden Bildungsgang. Eine Konsole nach
 * VDI 2230 auszulegen steht im Bildungsplan der Höheren Berufsfachschule und
 * der Fachoberschule, in dem der Berufsfachschule steht sie nicht. Wer seinen
 * Bildungsgang einmal wählt, bekommt von da an nur noch, was dort vorgesehen
 * ist - und kann es über "Übung anpassen" jederzeit wieder ändern.
 *
 * Die Wahl ist also eine Voreinstellung, keine Sperre. Nichts wird
 * unerreichbar; es steht nur nicht mehr von selbst da.
 *
 * Ein Teil, der nicht überall hingehört, sagt das selbst:
 *
 *     <h2 data-bg-ohne="bfs-hs10 bfs-for">Die verspannte Verbindung</h2>
 *
 * Kein Attribut heißt: gehört überall dazu. Das ist die richtige Vorgabe -
 * neue Inhalte erscheinen erst einmal für alle, und nur was wirklich zu hoch
 * oder zu speziell ist, bekommt eine Ausnahme.
 *
 * Eine ganze Seite nimmt sich genauso aus:
 *
 *     <meta name="bg-ohne" content="bfs-hs10 bfs-for">
 *
 * Dann verschwindet sie aus der Übersicht, und wer sie trotzdem öffnet,
 * bekommt oben einen Hinweis statt einer leeren Seite.
 *
 * Gemerkt wird die Wahl im localStorage - das bleibt auf dem Gerät, es wird
 * nichts übertragen. Weitergeben lässt sie sich als ?bg=… in der Adresse.
 *
 * Grundlage der Zuordnung sind die Bildungspläne des Landes NRW. Die
 * Auswertung liegt in bildungsgaenge/ (nicht im Repo).
 */
(function (global) {
  'use strict';

  var SCHLUESSEL = 'tbk-bildungsgang';
  var PARAM = 'bg';

  /* Reihenfolge wie im Umschalter: vom kürzesten Bildungsgang zum längsten. */
  var LISTE = [
    { schluessel: 'bfs-hs10', kurz: 'BFS (HS10)',
      name: 'Berufsfachschule – Hauptschulabschluss 10' },
    { schluessel: 'bfs-for', kurz: 'BFS (FOR)',
      name: 'Berufsfachschule – mittlerer Schulabschluss (FOR)' },
    { schluessel: 'hbfs-c2', kurz: 'HBFS (C2)',
      name: 'Höhere Berufsfachschule – Maschinen-/Automatisierungstechnik' },
    { schluessel: 'fos-c3', kurz: 'FOS (C3)',
      name: 'Fachoberschule – Maschinenbautechnik' },
    { schluessel: 'im', kurz: 'Industriemechaniker',
      name: 'Industriemechaniker/-in' },
    { schluessel: 'zm', kurz: 'Zerspanungsmechaniker',
      name: 'Zerspanungsmechaniker/-in' },
    { schluessel: 'tech', kurz: 'Techniker',
      name: 'Techniker/-in Maschinenbautechnik' }
  ];

  function kennt(w) {
    for (var i = 0; i < LISTE.length; i++) {
      if (LISTE[i].schluessel === w) return true;
    }
    return false;
  }

  function eintrag(w) {
    for (var i = 0; i < LISTE.length; i++) {
      if (LISTE[i].schluessel === w) return LISTE[i];
    }
    return null;
  }

  /* Früher hieß der Abschluss "Mittlere Reife". Der Bildungsplan spricht vom
     mittleren Schulabschluss (Fachoberschulreife), deshalb "bfs-for". Wer den
     alten Schlüssel gespeichert hat oder in einem alten Link mitbringt, soll
     nicht stillschweigend wieder alles sehen. */
  var FRUEHER = { 'bfs-mr': 'bfs-for' };

  function aufloesen(w) {
    if (FRUEHER[w]) return FRUEHER[w];
    return kennt(w) ? w : '';
  }

  /* Die Adresse schlägt den Speicher - ein weitergegebener Link soll zeigen,
     was der Absender gemeint hat, nicht was der Empfänger eingestellt hat. */
  function lesen() {
    try {
      var p = new URLSearchParams(location.search).get(PARAM);
      if (p) { var a = aufloesen(p); if (a) return a; }
      if (p === '') return '';
    } catch (e) { /* weiter mit dem Speicher */ }
    try {
      return aufloesen(global.localStorage.getItem(SCHLUESSEL));
    } catch (e) { return ''; }
  }

  function schreiben(wert) {
    try {
      if (wert) global.localStorage.setItem(SCHLUESSEL, wert);
      else global.localStorage.removeItem(SCHLUESSEL);
    } catch (e) { /* privates Fenster: gilt dann nur für diese Seite */ }
  }

  /* ---------- Was gehört dazu? ---------- */

  function ohneListe(el) {
    if (!el || !el.getAttribute) return [];
    var w = el.getAttribute('data-bg-ohne');
    return w ? w.split(/\s+/).filter(Boolean) : [];
  }

  /* Gilt der Teil für diesen Bildungsgang? Ohne Wahl gilt alles. */
  function gilt(el, bg) {
    if (!bg) return true;
    return ohneListe(el).indexOf(bg) === -1;
  }

  /* Mehrere Kandidaten, weil das Attribut mal an der Überschrift, mal am
     umgebenden Block sitzt - je nachdem, was die Seite hergibt. */
  function giltEines(kandidaten, bg) {
    if (!bg) return true;
    for (var i = 0; i < kandidaten.length; i++) {
      if (kandidaten[i] && !gilt(kandidaten[i], bg)) return false;
    }
    return true;
  }

  /* Nimmt sich die ganze Seite aus? */
  function seiteOhne() {
    var m = document.querySelector('meta[name="bg-ohne"]');
    var w = m && m.getAttribute('content');
    return w ? w.split(/\s+/).filter(Boolean) : [];
  }

  function seiteGilt(bg) {
    return !bg || seiteOhne().indexOf(bg) === -1;
  }

  /* ---------- Auswahlfeld ---------- */

  /* Was hinter der Auswahl steckt - und was nicht. Die Bildungsplaene sagen,
     welche Lernfelder ein Bildungsgang hat und was dort verlangt wird. Ob ein
     bestimmter Teil dieses Materials dazu passt, sagen sie nicht; das ist eine
     Auslegung. Wer damit arbeitet, soll das wissen. */
  var ERKLAERUNG = [
    ['Grundlage sind die Bildungspläne des Landes NRW: welche Lernfelder und '
      + 'Anforderungssituationen ein Bildungsgang hat und was dort verlangt wird.'],
    ['Welcher Teil dieses Materials dazu passt, steht dort aber nicht. Diese '
      + 'Zuordnung ist eine Auslegung – sie beruht auf Unterrichtserfahrung und '
      + 'darauf, wie die Pläne gelesen werden. An manchen Stellen kommen andere '
      + 'Lehrkräfte mit gutem Grund zu einem anderen Schluss.'],
    ['Deshalb ist die Wahl eine Voreinstellung und keine Vorschrift: Auf jeder '
      + 'Seite lässt sich anschließend jeder einzelne Teil wieder hinzunehmen '
      + 'oder weglassen. Gesperrt ist nichts.']
  ];

  var STIL_ID = 'tbk-bg-stil';
  var CSS = ''
    + '.bg-wahl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}'
    + '.bg-wahl label{font-weight:700;font-size:13px}'
    + '.bg-wahl select{flex:1 1 180px;min-width:0;font:inherit;font-size:13.5px;'
    + 'padding:7px 9px;border-radius:8px;color:inherit;'
    + 'background:var(--card,#fff);border:1px solid var(--border-stark,#cbd5e1)}'
    + '.bg-wahl select:focus-visible{outline:2px solid #2b6cb0;outline-offset:1px}'
    + '.bg-hinweis{font-size:12.5px;color:var(--muted,#5f5f5a);margin:6px 0 0}'
    + '.bg-info{flex:0 0 auto;width:22px;height:22px;padding:0;cursor:pointer;'
    + 'border-radius:50%;border:1px solid var(--border-stark,#cbd5e1);'
    + 'background:none;color:var(--muted,#5f5f5a);'
    + 'font:700 13px/1 Georgia,"Times New Roman",serif;font-style:italic}'
    + '.bg-info:hover{border-color:#2b6cb0;color:#2b6cb0}'
    + '.bg-info:focus-visible{outline:2px solid #2b6cb0;outline-offset:2px}'
    + '.bg-info[aria-expanded="true"]{background:#2b6cb0;border-color:#2b6cb0;color:#fff}'
    + '.bg-erklaerung{margin:10px 0 0;padding:11px 13px;border-radius:9px;'
    /* Im schmalen Anpassen-Fenster waechst der Text sonst so weit, dass fuer
       die Liste darunter nichts mehr bleibt. */
    + 'max-height:min(38vh,260px);overflow:auto;'
    + 'font-size:12.5px;line-height:1.55;color:var(--muted,#5f5f5a);'
    + 'background:var(--bg,#f7f7f5);border:1px solid var(--border,#e3e3df)}'
    + '.bg-erklaerung p{margin:0 0 7px}'
    + '.bg-erklaerung p:last-child{margin:0}'
    + '.bg-erklaerung[hidden]{display:none}'
    + '@media print{.bg-wahl,.bg-erklaerung,.bg-hinweis{display:none!important}}';

  function stil() {
    if (document.getElementById(STIL_ID)) return;
    var s = document.createElement('style');
    s.id = STIL_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* Baut das Auswahlfeld und meldet jede Änderung. Der Aufrufer entscheidet,
     was daraus folgt - hier wird nur gewählt und gemerkt. */
  function waehler(beiWahl, beschriftung) {
    stil();
    /* Zwei Teile: die Zeile mit der Wahl und darunter die Erklärung, die das
       Info-Symbol aufklappt. Beides zusammen wird zurückgegeben, damit sie
       nicht auseinanderlaufen. */
    var block = document.createElement('div');
    var huelle = document.createElement('div');
    huelle.className = 'bg-wahl';
    block.appendChild(huelle);

    var id = 'bg-feld-' + Math.random().toString(36).slice(2, 7);
    var label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = beschriftung || 'Bildungsgang';

    var feld = document.createElement('select');
    feld.id = id;

    var leer = document.createElement('option');
    leer.value = '';
    leer.textContent = 'alle Inhalte zeigen';
    feld.appendChild(leer);

    LISTE.forEach(function (b) {
      var o = document.createElement('option');
      o.value = b.schluessel;
      o.textContent = b.name;
      feld.appendChild(o);
    });

    feld.value = lesen();
    feld.addEventListener('change', function () {
      schreiben(feld.value);
      beiWahl(feld.value);
    });

    /* Das Symbol sagt, woher die Auswahl kommt - und dass sie eine Auslegung
       ist. Ein Klick klappt den Text auf; ein reiner title-Tooltip hilft auf
       dem Tablet nicht weiter. */
    var erklaerung = document.createElement('div');
    erklaerung.className = 'bg-erklaerung';
    erklaerung.id = id + '-erkl';
    erklaerung.hidden = true;
    ERKLAERUNG.forEach(function (absatz) {
      var p = document.createElement('p');
      p.textContent = absatz[0];
      erklaerung.appendChild(p);
    });

    var info = document.createElement('button');
    info.type = 'button';
    info.className = 'bg-info';
    info.textContent = 'i';
    info.title = 'Wie diese Auswahl zustande kommt';
    info.setAttribute('aria-label', 'Wie diese Auswahl zustande kommt');
    info.setAttribute('aria-expanded', 'false');
    info.setAttribute('aria-controls', erklaerung.id);
    info.addEventListener('click', function () {
      var auf = erklaerung.hidden;
      erklaerung.hidden = !auf;
      info.setAttribute('aria-expanded', String(auf));
    });

    huelle.appendChild(label);
    huelle.appendChild(feld);
    huelle.appendChild(info);
    block.appendChild(erklaerung);

    return { knoten: block, feld: feld, info: info, erklaerung: erklaerung };
  }

  /* Stellt jemand in einem anderen Tab um, zieht dieser mit. */
  function beiFremderWahl(fn) {
    global.addEventListener('storage', function (e) {
      if (e.key === SCHLUESSEL) fn(lesen());
    });
  }

  global.tbkBildungsgang = {
    LISTE: LISTE,
    SCHLUESSEL: SCHLUESSEL,
    PARAM: PARAM,
    kennt: kennt,
    stil: stil,
    eintrag: eintrag,
    lesen: lesen,
    schreiben: schreiben,
    gilt: gilt,
    giltEines: giltEines,
    ohneListe: ohneListe,
    seiteOhne: seiteOhne,
    seiteGilt: seiteGilt,
    waehler: waehler,
    beiFremderWahl: beiFremderWahl
  };
}(window));
