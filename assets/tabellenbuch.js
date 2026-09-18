/* Liegt das Tabellenbuch auf dem Tisch?
 *
 * Eingebunden wie die übrigen Bausteine am Ende der Seite:
 *
 *     <script src="../../assets/tabellenbuch.js"></script>
 *
 * build/build.mjs trägt die Zeile nach, sobald eine Seite etwas auszeichnet.
 *
 * Warum es ihn gibt
 * -----------------
 * Das Material setzt durchgehend voraus, dass jemand nachschlagen kann. In
 * der Berufsfachschule, Stufe HS10, ist das oft nicht der Fall: Die Klasse
 * hat kein Tabellenbuch, oder nicht genug davon. Dann steht die Hälfte der
 * Aufgaben still, und zwar nicht, weil der Stoff zu schwer wäre, sondern
 * weil die Quelle fehlt.
 *
 * Drei Zustände
 * -------------
 *   mit      Das Buch liegt vor. Alles wie bisher - die Vorgabe.
 *   ohne     Kein Buch. Was ohne Buch nicht geht, fällt weg.
 *   auszug   Kein Buch. Die gebrauchten Zeilen stehen in der Aufgabe.
 *
 * Wer `bfs-hs10` als Bildungsgang wählt und den Schalter noch nie angefasst
 * hat, bekommt "ohne" vorgeschlagen. Vorgeschlagen, nicht gesetzt: Sobald
 * jemand selbst wählt, gilt seine Wahl - auch "mit".
 *
 * Wie eine Seite mitspielt
 * ------------------------
 *     <details data-tb="noetig">…</details>     fällt bei "ohne" weg
 *     <div data-tb="auszug">…</div>             steht nur bei "auszug" da
 *     <meta name="tb" content="noetig">         die ganze Seite braucht es
 *
 * `data-tb` darf an jedem Element stehen - an einem Abschnitt, an einer
 * einzelnen Aufgabe, an einer Teilaufgabe, an einer Tabellenzeile. Darin
 * unterscheidet es sich von `data-bg-ohne`, das der Baukasten nur an seinen
 * eigenen Teilen liest. An einer h2 meint es den ganzen Abschnitt bis zur
 * naechsten h2 - sonst verschwaende nur die Ueberschrift.
 *
 * Ein Auszug ist **immer** verborgen, außer im Zustand "auszug". Auch "alle
 * Inhalte zeigen" holt ihn nicht hervor: Er ist kein weggelassener Teil,
 * sondern ein Ersatz für etwas, das sonst auf dem Tisch liegt. Stünde er
 * daneben, läse niemand mehr im Buch.
 *
 * Was ein Auszug NICHT tut
 * ------------------------
 * Er hebt die gesuchte Zeile nicht hervor. Er zeigt sie mit ihren Nachbarn,
 * genau wie das Buch - die richtige Zeile zu finden ist die Aufgabe und
 * nicht die Zugabe. Und er bleibt ein Auszug: ein paar Zeilen mit
 * Quellenangabe, keine nachgebaute Tabelle (siehe assets/quellen.js).
 *
 * Dieselbe Datei liegt in zwei Repos - wird sie geändert, gehört sie in
 * beide kopiert.
 */
(function (global) {
  'use strict';

  var SCHLUESSEL = 'tbk-tabellenbuch';
  var PARAM = 'tb';

  var LISTE = [
    { schluessel: 'mit', kurz: 'liegt vor',
      name: 'Tabellenbuch liegt vor' },
    { schluessel: 'ohne', kurz: 'ohne Buch',
      name: 'ohne Tabellenbuch – Aufgaben weglassen' },
    { schluessel: 'auszug', kurz: 'mit Auszügen',
      name: 'ohne Tabellenbuch – Auszüge in der Aufgabe' }
  ];

  function kennt(w) {
    for (var i = 0; i < LISTE.length; i++) {
      if (LISTE[i].schluessel === w) return true;
    }
    return false;
  }

  /* Die ausdrückliche Wahl - leer, solange niemand gewählt hat. Die Adresse
     geht vor: Wer einen Link weitergibt, gibt auch diese Einstellung mit. */
  function lesen() {
    try {
      var p = new URLSearchParams(location.search).get(PARAM);
      if (p && kennt(p)) return p;
    } catch (e) { /* weiter mit dem Speicher */ }
    try {
      var w = global.localStorage.getItem(SCHLUESSEL);
      return kennt(w) ? w : '';
    } catch (e) { return ''; }
  }

  function schreiben(wert) {
    try {
      if (kennt(wert)) global.localStorage.setItem(SCHLUESSEL, wert);
      else global.localStorage.removeItem(SCHLUESSEL);
    } catch (e) { /* privates Fenster: gilt dann nur für diese Seite */ }
  }

  /* Was der Bildungsgang nahelegt, solange niemand selbst gewählt hat. */
  function vorschlag() {
    var B = global.tbkBildungsgang;
    if (!B) return '';
    try { return B.lesen() === 'bfs-hs10' ? 'ohne' : ''; } catch (e) { return ''; }
  }

  /* Der Zustand, der wirklich gilt. */
  function gilt() {
    return lesen() || vorschlag() || 'mit';
  }

  function ausVorschlag() {
    return !lesen() && !!vorschlag();
  }

  /* ---------- Anwenden ---------- */

  /* Nur was dieser Baustein selbst verborgen hat, blendet er wieder ein.
     Mehrere Seiten verbergen Teile von sich aus, bis jemand eine Aufgabe
     gelöst hat - die gehören ihm nicht. */
  var vonUns = [];

  function verbergen(k, weg) {
    if (weg) {
      if (!k.hidden) {
        k.hidden = true;
        if (vonUns.indexOf(k) === -1) vonUns.push(k);
      }
      return;
    }
    var i = vonUns.indexOf(k);
    if (i !== -1) {
      k.hidden = false;
      vonUns.splice(i, 1);
    }
  }

  /* An einer h2 meint das Attribut den ganzen Abschnitt - die Überschrift
     mit allem, was ihr bis zur nächsten h2 folgt. Dieselbe Regel wie im
     Baukasten, und aus demselben Grund: Nur die Überschrift zu verbergen
     ließe die Aufgabe stehen und nähme ihr den Namen. Überall sonst gilt
     das Attribut genau für sein Element - ein details, eine Zeile, ein
     Feld. */
  function bereich(k) {
    if (k.tagName !== 'H2') return [k];
    var aus = [k], n = k.nextElementSibling;
    while (n && n.tagName !== 'H2' && !n.querySelector('h2')) {
      aus.push(n);
      n = n.nextElementSibling;
    }
    return aus;
  }

  function anwenden() {
    var zustand = gilt();
    [].slice.call(document.querySelectorAll('[data-tb]')).forEach(function (k) {
      var art = k.getAttribute('data-tb');
      var weg = art === 'noetig' ? zustand === 'ohne'
        : art === 'auszug' ? zustand !== 'auszug' : null;
      if (weg === null) return;
      bereich(k).forEach(function (n) { verbergen(n, weg); });
    });
    seitenhinweis(zustand);
    document.documentElement.setAttribute('data-tb-zustand', zustand);
  }

  /* Gilt die ganze Seite nicht ohne Buch, wird sie nicht versteckt - sie
     bekommt oben eine Zeile, die das sagt. Wer hier gelandet ist, wollte
     meistens hierhin. Dieselbe Haltung wie beim Bildungsgang. */
  function seiteOhne() {
    var m = document.querySelector('meta[name="tb"]');
    return !!m && (m.getAttribute('content') || '').trim() === 'noetig';
  }

  function seiteGilt(zustand) {
    return !seiteOhne() || (zustand || gilt()) !== 'ohne';
  }

  /* Manche Seiten leben vom Nachschlagen selbst - das Schnellsuchen in der
     Gewindetabelle etwa. Ihnen hilft auch ein Auszug nicht: Ihre Aufgabe
     IST das Buch. Sie sagen das mit <meta name="tb" content="noetig"> und
     bringen keinen einzigen Auszug mit. Der Hinweis unterscheidet deshalb,
     ob die Seite einen Ersatz anzubieten hat. */
  function seitenhinweis(zustand) {
    var alt = document.getElementById('tb-seite');
    if (alt) alt.remove();
    zustand = zustand || gilt();
    if (!seiteOhne() || zustand === 'mit') return;
    var hatAuszug = !!document.querySelector('[data-tb="auszug"]');
    if (zustand === 'auszug' && hatAuszug) return;
    var haupt = document.querySelector('main');
    if (!haupt) return;
    stil();
    var e = document.createElement('p');
    e.id = 'tb-seite';
    e.className = 'tb-seitenhinweis';
    e.innerHTML = '<strong>Diese Seite braucht das Tabellenbuch.</strong> '
      + (hatAuszug
        ? 'Eingestellt ist &bdquo;Aufgaben weglassen&ldquo;. Mit '
          + '&bdquo;Ausz&uuml;ge in der Aufgabe&ldquo; l&auml;sst sie sich '
          + 'auch ohne Buch bearbeiten.'
        : 'Hier hilft auch kein Auszug weiter &ndash; ge&uuml;bt wird das '
          + 'Nachschlagen selbst. Die Seite steht trotzdem offen.');
    haupt.insertBefore(e, haupt.firstChild);
  }

  /* ---------- Auswahlfeld ---------- */

  var ERKLAERUNG = [
    ['Nicht jede Lerngruppe hat ein Tabellenbuch auf dem Tisch. Ohne Buch '
      + 'steht ein Teil der Aufgaben still – nicht, weil der Stoff zu schwer '
      + 'wäre, sondern weil die Quelle fehlt.'],
    ['„Aufgaben weglassen“ nimmt heraus, was ohne Buch nicht geht. '
      + '„Auszüge in der Aufgabe“ lässt alles stehen und stellt die '
      + 'gebrauchten Zeilen daneben – mit ihren Nachbarzeilen, damit die '
      + 'richtige Zeile weiterhin gesucht werden muss.'],
    ['Ein Auszug ist ein Auszug und kein Ersatz für das Buch: ein paar '
      + 'Zeilen mit Quellenangabe. Wo das Buch vorliegt, gehört es benutzt – '
      + 'Nachschlagen ist selbst ein Lernziel.']
  ];

  var STIL_ID = 'tbk-tb-stil';
  var CSS = ''
    + '.tb-auszug{margin:14px 0;padding:11px 13px;border-radius:10px;'
    + 'border:1px solid var(--border,#e3e3df);border-left:4px solid '
    + 'var(--accent,#2b6cb0);background:var(--bg,#f7f7f5);font-size:14px}'
    + '.tb-auszug > h4{margin:0 0 7px;font-size:12.5px;letter-spacing:.04em;'
    + 'text-transform:uppercase;color:var(--muted,#5f5f5a)}'
    + '.tb-auszug table{width:100%;border-collapse:collapse;font-size:13.5px}'
    + '.tb-auszug th,.tb-auszug td{padding:4px 8px;text-align:left;'
    + 'border-bottom:1px solid var(--border,#e3e3df)}'
    + '.tb-auszug th{font-size:12.5px;color:var(--muted,#5f5f5a)}'
    + '.tb-auszug td.zahl,.tb-auszug th.zahl{text-align:right;'
    + 'font-variant-numeric:tabular-nums}'
    + '.tb-auszug tr:last-child td{border-bottom:0}'
    + '.tb-auszug .tb-quelle{margin:7px 0 0;font-size:11.5px;'
    + 'color:var(--muted,#5f5f5a)}'
    + '.tb-auszug .tb-rahmen{overflow-x:auto}'
    + '.tb-seitenhinweis{margin:0 0 18px;padding:11px 14px;border-radius:10px;'
    + 'border:1px solid var(--warn,#b45309);border-left-width:4px;'
    + 'background:var(--card,#fff);font-size:14.5px}'
    + '@media print{.tb-wahl,.tb-seitenhinweis{display:none!important}}';

  function stil() {
    if (document.getElementById(STIL_ID)) return;
    var s = document.createElement('style');
    s.id = STIL_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* Baut das Auswahlfeld und meldet jede Änderung. Es sieht aus wie das des
     Bildungsgangs und benutzt dessen Stilklassen - zwei Schalter, die
     nebeneinander stehen, sollen auch nebeneinander aussehen. */
  function waehler(beiWahl) {
    stil();
    /* Die Zeile sieht aus wie die des Bildungsgangs und benutzt dessen
       Stile - zwei Schalter nebeneinander sollen nicht verschieden
       aussehen. */
    if (global.tbkBildungsgang && global.tbkBildungsgang.stil) {
      global.tbkBildungsgang.stil();
    }

    var block = document.createElement('div');
    var huelle = document.createElement('div');
    huelle.className = 'bg-wahl tb-wahl';
    block.appendChild(huelle);

    var id = 'tb-feld-' + Math.random().toString(36).slice(2, 7);
    var label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = 'Tabellenbuch';

    var feld = document.createElement('select');
    feld.id = id;
    LISTE.forEach(function (b) {
      var o = document.createElement('option');
      o.value = b.schluessel;
      o.textContent = b.name;
      feld.appendChild(o);
    });
    feld.value = gilt();

    var hinweis = document.createElement('p');
    hinweis.className = 'bg-hinweis';

    function hinweisSetzen() {
      hinweis.textContent = ausVorschlag()
        ? 'Vorgeschlagen, weil der Bildungsgang HS10 gewählt ist. Eine '
          + 'eigene Wahl hier gilt vor dem Vorschlag.'
        : '';
      hinweis.hidden = !hinweis.textContent;
    }
    hinweisSetzen();

    feld.addEventListener('change', function () {
      schreiben(feld.value);
      hinweisSetzen();
      anwenden();
      if (beiWahl) beiWahl(feld.value);
    });

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
    info.title = 'Was dieser Schalter tut';
    info.setAttribute('aria-label', 'Was dieser Schalter tut');
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
    block.appendChild(hinweis);
    block.appendChild(erklaerung);

    return {
      knoten: block, feld: feld, info: info, erklaerung: erklaerung,
      auffrischen: function () { feld.value = gilt(); hinweisSetzen(); }
    };
  }

  function beiFremderWahl(fn) {
    global.addEventListener('storage', function (e) {
      if (e.key === SCHLUESSEL || e.key === 'tbk-bildungsgang') fn(gilt());
    });
  }

  global.tbkTabellenbuch = {
    LISTE: LISTE,
    SCHLUESSEL: SCHLUESSEL,
    PARAM: PARAM,
    kennt: kennt,
    lesen: lesen,
    schreiben: schreiben,
    vorschlag: vorschlag,
    ausVorschlag: ausVorschlag,
    gilt: gilt,
    anwenden: anwenden,
    seiteOhne: seiteOhne,
    seiteGilt: seiteGilt,
    waehler: waehler,
    beiFremderWahl: beiFremderWahl
  };

  /* Der Baukasten schneidet die Seite zu und kann dabei einen Auszug
     mitnehmen, der zufällig neben einer Überschrift liegt. Danach gilt
     wieder, was hier steht - deshalb die Meldung und die Antwort darauf. */
  document.addEventListener('tbk-zuschnitt', function () { anwenden(); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', anwenden);
  } else { anwenden(); }
}(window));
