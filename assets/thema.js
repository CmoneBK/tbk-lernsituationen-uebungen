/* Hell oder dunkel - einmal gewaehlt, gilt es im ganzen Materialbereich.
 *
 * Eingebunden wird der Baustein mit einer Zeile im head, damit er laeuft,
 * bevor gezeichnet wird:
 *
 *     <script src="../assets/thema.js"></script>
 *
 * build/build.mjs traegt sie in jeder Seite nach - auch in der Uebersicht und
 * in den Paketseiten.
 *
 * Drei Zustaende, nicht zwei:
 *
 *   System   folgt der Einstellung von Betriebssystem und Browser (Vorgabe)
 *   Hell     erzwingt die helle Palette
 *   Dunkel   erzwingt die dunkle
 *
 * "System" ist bewusst die Vorgabe: Wer sein Geraet auf dunkel gestellt hat,
 * will das meist ueberall. Der Schalter ist fuer die Faelle, in denen das
 * nicht stimmt - Beamer im hellen Raum, Ausdruck vorbereiten, Screenshot fuer
 * ein Arbeitsblatt.
 *
 * Umgesetzt wird die Wahl als data-thema am html-Element. Das CSS kennt drei
 * Regeln (siehe assets/uebung.css):
 *
 *     :root                                      helle Farben
 *     @media (prefers-color-scheme:dark)
 *       :root:not([data-thema="hell"])           dunkle Farben
 *     :root[data-thema="dunkel"]                 dunkle Farben
 *
 * Gemerkt wird die Wahl im localStorage - das bleibt auf dem Geraet, es wird
 * nichts uebertragen. Faellt der Speicher aus (privates Fenster, gesperrte
 * Website-Daten), faellt der Schalter auf "System" zurueck und funktioniert
 * fuer die laufende Seite trotzdem.
 */
(function () {
  'use strict';

  var SCHLUESSEL = 'tbk-thema';
  var ZUSTAENDE = ['system', 'hell', 'dunkel'];

  /* Das Symbol zeigt, was gerade gilt - nicht, was ein Klick bewirkt. */
  var SYMBOLE = { system: '◐', hell: '☀', dunkel: '☾' };
  var NAMEN = { system: 'System', hell: 'Hell', dunkel: 'Dunkel' };

  function lesen() {
    try {
      var w = window.localStorage.getItem(SCHLUESSEL);
      return ZUSTAENDE.indexOf(w) === -1 ? 'system' : w;
    } catch (e) { return 'system'; }
  }

  function schreiben(wert) {
    try { window.localStorage.setItem(SCHLUESSEL, wert); } catch (e) { /* egal */ }
  }

  /* Setzt das Attribut. Bei "system" wird es entfernt, damit wieder die
     Media-Regel greift. */
  function anwenden(wert) {
    var html = document.documentElement;
    if (wert === 'system') html.removeAttribute('data-thema');
    else html.setAttribute('data-thema', wert);
  }

  /* Sofort, noch vor dem ersten Zeichnen: Sonst blitzt die falsche Palette
     kurz auf. Deshalb steht dieser Baustein im head. */
  var aktuell = lesen();
  anwenden(aktuell);

  var STIL =
    '#tbk-thema{position:fixed!important; top:14px!important; right:14px!important;' +
    'z-index:2147483646!important; display:inline-flex!important; align-items:center!important;' +
    'gap:7px!important; padding:8px 12px!important; border-radius:999px!important;' +
    'font:600 14px/1 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;' +
    'color:#1a1a1a!important; background:rgba(255,255,255,.92)!important;' +
    'border:1px solid rgba(0,0,0,.14)!important; box-shadow:0 1px 3px rgba(0,0,0,.18)!important;' +
    'cursor:pointer!important; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);}' +
    '#tbk-thema:hover{border-color:rgba(0,0,0,.32)!important}' +
    '#tbk-thema:focus-visible{outline:2px solid #2b6cb0!important; outline-offset:2px!important}' +
    '#tbk-thema .z{font-size:15px!important; line-height:1!important}' +
    /* Im dunklen Modus dreht sich die Farbe des Schalters mit. */
    '@media (prefers-color-scheme:dark){' +
    ' :root:not([data-thema="hell"]) #tbk-thema{color:#ececec!important;' +
    ' background:rgba(30,30,33,.92)!important; border-color:rgba(255,255,255,.18)!important}}' +
    ':root[data-thema="dunkel"] #tbk-thema{color:#ececec!important;' +
    ' background:rgba(30,30,33,.92)!important; border-color:rgba(255,255,255,.18)!important}' +
    /* Beim Drucken und in der Ausgabe hat der Schalter nichts zu suchen. */
    '@media print{#tbk-thema{display:none!important}}' +
    '@media (max-width:560px){#tbk-thema .t{display:none!important}' +
    ' #tbk-thema{padding:9px 11px!important}}';

  function aufbauen() {
    if (document.getElementById('tbk-thema')) return;

    var stil = document.createElement('style');
    stil.textContent = STIL;
    document.head.appendChild(stil);

    var knopf = document.createElement('button');
    knopf.id = 'tbk-thema';
    knopf.type = 'button';
    /* Die Leiste unten rechts (Anpassen, Herunterladen) raeumt beim Ausgeben
       auf; dieser Knopf gehoert genauso wenig in den Ausdruck. */
    knopf.setAttribute('data-druck', 'weg');
    document.body.appendChild(knopf);

    function beschriften() {
      knopf.innerHTML = '<span class="z" aria-hidden="true">' + SYMBOLE[aktuell] +
        '</span><span class="t">' + NAMEN[aktuell] + '</span>';
      knopf.setAttribute('aria-label', 'Darstellung: ' + NAMEN[aktuell] +
        '. Klicken für ' + NAMEN[ZUSTAENDE[(ZUSTAENDE.indexOf(aktuell) + 1) % 3]] + '.');
      knopf.title = 'Darstellung: ' + NAMEN[aktuell] +
        ' – umschalten zwischen System, Hell und Dunkel';
    }
    beschriften();

    knopf.addEventListener('click', function () {
      aktuell = ZUSTAENDE[(ZUSTAENDE.indexOf(aktuell) + 1) % 3];
      anwenden(aktuell);
      schreiben(aktuell);
      beschriften();
      /* Seiten, die etwas in currentColor gezeichnet haben, zeichnen von
         selbst richtig weiter - SVG erbt die Farbe. Wer Werte in einer
         Zeichnung eingefaerbt hat, bekommt es ueber dieses Ereignis mit. */
      document.dispatchEvent(new CustomEvent('tbk-thema', { detail: aktuell }));
    });
  }

  /* Ist die Seite mehrfach offen, ziehen die anderen Tabs mit. */
  window.addEventListener('storage', function (e) {
    if (e.key !== SCHLUESSEL) return;
    aktuell = lesen();
    anwenden(aktuell);
    var k = document.getElementById('tbk-thema');
    if (k) {
      k.innerHTML = '<span class="z" aria-hidden="true">' + SYMBOLE[aktuell] +
        '</span><span class="t">' + NAMEN[aktuell] + '</span>';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aufbauen);
  } else {
    aufbauen();
  }
}());
