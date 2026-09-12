/* Mausrad in Zahlenfeldern - ohne dass die Seite dabei wegrutscht.
 *
 * Eingebunden wird der Baustein mit einer Zeile vor dem schliessenden
 * body-Tag; build/build.mjs traegt sie in jeder Seite nach, die ein Feld vom
 * Typ "number" oder "range" enthaelt:
 *
 *     <script src="../../assets/zahlenfeld.js"></script>
 *
 * Die Browser aendern den Wert eines Zahlenfeldes beim Scrollen von sich aus,
 * scrollen aber gleichzeitig die Seite weiter - man verstellt also einen Wert
 * und verliert ihn im selben Moment aus dem Blick. Darum uebernimmt dieser
 * Baustein das Rad selbst: Er unterdrueckt das Scrollen und setzt den Wert.
 *
 * Zwei Bedingungen muessen zusammenkommen, damit er zugreift:
 *
 *   1. Der Zeiger steht ueber dem Feld (das Rad-Ereignis geht ohnehin dorthin).
 *   2. Das Feld hat den Fokus.
 *
 * Die zweite ist die wichtigere. Ohne sie wuerde jedes Feld, an dem man beim
 * Lesen vorbeiscrollt, die Seite anhalten und nebenbei seinen Wert verstellen.
 * So muss man das Feld erst anklicken - und wer weiterlesen will, klickt
 * daneben.
 *
 * Gerechnet wird auf dem Raster aus min und step, wie es auch die Pfeiltasten
 * tun: min="0.02" step="0.01" zaehlt in Hundertsteln, nicht in Einsen. Am
 * Ende wird auf so viele Stellen gerundet, wie step hat - sonst kaeme aus
 * 0.15 + 0.01 die uebliche Fliesskomma-Ausbeute 0.16000000000000003 heraus.
 *
 * Anschliessend loest der Baustein "input" und "change" aus, damit die Seite
 * neu rechnet und zeichnet. Fuer sie sieht es aus wie eine Eingabe von Hand.
 */
(function () {
  'use strict';

  /* Ein Rasten am Mausrad meldet meist 100, ein Touchpad dagegen viele kleine
     Betraege. Darum wird aufsummiert und erst ab dieser Schwelle geschaltet. */
  var SCHWELLE = 40;
  var PAUSE = 500;        // ms; danach faengt die Summe wieder bei null an

  var summe = 0;
  var letztesFeld = null;
  var letzteZeit = 0;

  function passend(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    var t = (el.getAttribute('type') || '').toLowerCase();
    if (t !== 'number' && t !== 'range') return false;
    return !el.disabled && !el.readOnly;
  }

  function zahl(wert) {
    var z = parseFloat(wert);
    return isFinite(z) ? z : null;
  }

  function schritt(feld) {
    var s = zahl(feld.getAttribute('step'));   // step="any" ergibt null
    return s && s > 0 ? s : 1;
  }

  /* Wie viele Nachkommastellen hat die Schrittweite? Danach wird gerundet. */
  function stellen(feld) {
    var s = String(feld.getAttribute('step') || '');
    var punkt = s.indexOf('.');
    return punkt === -1 ? 0 : s.length - punkt - 1;
  }

  function drehen(feld, richtung) {
    var min = zahl(feld.getAttribute('min'));
    var max = zahl(feld.getAttribute('max'));
    var st = schritt(feld);
    var wert = zahl(feld.value);
    var neu;

    if (wert === null) {
      // Leeres Feld: der erste Ausschlag setzt den Anfangswert, statt von
      // einer gedachten Null aus loszuzaehlen.
      neu = min !== null ? min : 0;
    } else {
      var basis = min !== null ? min : 0;
      var stufen = Math.round((wert - basis) / st);
      neu = basis + (stufen + richtung) * st;
    }

    if (min !== null && neu < min) neu = min;
    if (max !== null && neu > max) neu = max;

    var text = String(parseFloat(neu.toFixed(Math.max(stellen(feld), 0))));
    if (text === feld.value) return;
    feld.value = text;
    feld.dispatchEvent(new Event('input', { bubbles: true }));
    feld.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* deltaY kommt je nach Geraet in Pixeln, Zeilen oder Seiten. */
  function betrag(e) {
    var d = e.deltaY || 0;
    if (e.deltaMode === 1) d *= 16;
    else if (e.deltaMode === 2) d *= 400;
    return d;
  }

  document.addEventListener('wheel', function (e) {
    var feld = e.target;
    if (!passend(feld) || document.activeElement !== feld) return;

    // Ab hier gehoert das Rad dem Feld: Die Seite bleibt stehen, auch wenn
    // der Wert schon am Anschlag ist. Sonst wandert die Zeile beim letzten
    // Schritt doch noch aus dem Bild.
    e.preventDefault();

    var jetzt = Date.now();
    if (feld !== letztesFeld || jetzt - letzteZeit > PAUSE) summe = 0;
    letztesFeld = feld;
    letzteZeit = jetzt;

    var d = betrag(e);
    if (Math.abs(d) >= SCHWELLE) {
      // Eine Rastung am Mausrad ist ein Schritt - egal, wie gross der Browser
      // sie meldet (ueblich sind 100). Sonst spraenge ein Rasten um mehrere.
      summe = 0;
      drehen(feld, d < 0 ? 1 : -1);
      return;
    }
    summe += d;
    while (summe <= -SCHWELLE) { summe += SCHWELLE; drehen(feld, 1); }
    while (summe >= SCHWELLE) { summe -= SCHWELLE; drehen(feld, -1); }
  }, { passive: false });
}());
