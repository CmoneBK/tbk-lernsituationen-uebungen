/* Was jede Zusammenstellungszeichnung braucht.
 *
 * Eingebunden nach assets/zeichnen.js und vor dem Baustein der Baugruppe:
 *
 *     <script src="../../assets/zeichnen.js"></script>
 *     <script src="../../assets/zusammenstellung.js"></script>
 *     <script src="../../assets/biegepresse.js"></script>
 *
 * Dieselbe Datei liegt in zwei Repos (Material und Werkzeuge) - wird sie
 * geändert, gehört sie in beide kopiert, wie assets/thema.js auch.
 *
 * Es gibt inzwischen drei Baugruppen - die Biegepresse, die Bohrvorrichtung
 * und den Klappanschlag -, und jede braucht dieselben Handgriffe: einen
 * geschnittenen Umriss, eine Positionsnummer, ein Maß, das kürzer ist als
 * seine Pfeile, eine Schnittmarke, ein Schriftfeld. Dreimal dasselbe
 * hinzuschreiben hieße, es dreimal zu pflegen - und nach der zweiten
 * Änderung wären es drei verschiedene Zeichnungen.
 *
 * Alles hier arbeitet in Bildpunkten. Wie Millimeter zu Bildpunkten werden,
 * weiß jede Baugruppe selbst: Sie bringt ihre eigenen Umrechner mit.
 */
(function (global) {
  'use strict';

  /* Ein geschnittenes Teil ist EIN Umriss, nicht drei Rechtecke. Wer
     Rechtecke übereinanderlegt, bekommt Linien mitten im Werkstoff, wo gar
     keine Kante ist. Deshalb wird jede Schnittfläche als geschlossener
     Streckenzug übergeben - in Bildpunkten. */
  function schnittTeil(g, punkte, fuell) {
    var d = punkte.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ') + ' Z';
    svgEl('path', {d: d, fill: fuell, stroke: 'none'}, g);
    svgEl('path', {d: d, fill: 'none', stroke: 'currentColor',
      'stroke-width': BREIT, 'stroke-linejoin': 'miter'}, g);
  }

  /* Positionsnummer nach DIN EN ISO 6433: etwa doppelt so groß wie die
     Maßzahlen, außerhalb der Umrisslinien, mit Hinweislinie und Punkt auf
     der Fläche des Teils.

     Gefüllte Scheibe mit heller Zahl, wie die Nahtbuchstaben am Lagerbock.
     Ein dünner Kreis wäre normnäher, aber die Zahl liegt dann auf seiner
     eigenen Kontur - und das liest sich schlechter, als es aussieht. */
  function posNr(g, nr, zx, zy, kx, ky) {
    var h = svgEl('g', {'class': 'posnr'}, g);
    /* Die Hinweislinie beginnt am Rand der Marke, nicht in ihrer Mitte -
       sonst liefe sie unter der Zahl hindurch. */
    var dx = zx - kx, dy = zy - ky, l = Math.hypot(dx, dy) || 1;
    linie(h, kx + dx / l * 13, ky + dy / l * 13, zx, zy, SCHMAL);
    svgEl('circle', {cx: zx, cy: zy, r: 2.6, fill: 'currentColor'}, h);
    svgEl('circle', {cx: kx, cy: ky, r: 12, fill: 'currentColor'}, h);
    svgEl('text', {x: kx, y: ky + 6.5, 'text-anchor': 'middle',
      'font-size': 17, 'font-weight': 700,
      fill: 'var(--card, #ffffff)'}, h).textContent = String(nr);
    return h;
  }

  /* Ein senkrechtes Maß, das kürzer ist als seine eigenen Pfeile. mass()
     kann das schon - die Pfeile zeigen dann von außen herein und die
     Maßzahl steht daneben; massV() kann es nicht, und ein Spalt von zwei
     Millimetern ist genau so ein Fall. */
  function massVeng(g, y1, y2, x, text, vonX, links) {
    var k = svgEl('g', {}, g);
    var vx2 = (vonX.length === 2) ? vonX : [vonX, vonX];
    [[y1, vx2[0]], [y2, vx2[1]]].forEach(function (e) {
      linie(k, e[1], e[0], x + (x > e[1] ? 7 : -7), e[0], SCHMAL);
    });
    linie(k, x, y1 - 12, x, y2 + 12, SCHMAL);
    pfeil(k, x, y1, 0, 1);
    pfeil(k, x, y2, 0, -1);
    txt(k, links ? x - 6 : x + 6, (y1 + y2) / 2 + 4, text,
      {anker: links ? 'end' : 'start'});
    return k;
  }

  /* Durchmesser und Winkel nach DIN ISO 129-1 an einer Hinweislinie, weil
     im Kreis kein Platz für die Maßzahl ist. */
  function massHinweis(g, zx, zy, ab, hoch, text) {
    var h = svgEl('g', {'class': 'hinweis'}, g);
    var x1 = zx + ab, y1 = zy - hoch;
    var l = Math.hypot(ab, hoch) || 1;
    linie(h, x1, y1, zx, zy, SCHMAL);
    pfeil(h, zx, zy, -ab / l, hoch / l);
    var r = ab < 0 ? -1 : 1;
    linie(h, x1, y1, x1 + r * (text.length * 7 + 8), y1, SCHMAL);
    svgEl('text', {x: x1 + r * 4, y: y1 - 6, 'font-size': 12.5,
      'text-anchor': r < 0 ? 'end' : 'start', fill: 'currentColor'}, h)
      .textContent = text;
    return h;
  }

  /* Eine Schnittmarke: der dicke Strich auf der Schnittlinie, der Pfeil in
     Blickrichtung, der Buchstabe.

     Sie steht in einer eigenen Gruppe. Ein Schnittpfeil zeigt die
     Blickrichtung und nicht ein Maß; er hat nach DIN ISO 128-40 nur ein
     Ende, und pruefungen/test-zeichnungen.js weiß das an dieser Kennung. */
  function schnittmarke(g, o) {
    var m = svgEl('g', {'class': 'schnittmarke'}, g);
    var x = o.x, y = o.y, r = 18, l = 32;
    if (o.richtung === 'oben' || o.richtung === 'unten') {
      var v = o.richtung === 'unten' ? 1 : -1;
      linie(m, x - r, y, x + r, y, BREIT);
      linie(m, x, y, x, y + v * l, SCHMAL);
      pfeil(m, x, y + v * l, 0, v);
      txt(m, x, y + v * (l + (v > 0 ? 20 : 8)), o.name,
        {groesse: 17, fett: true});
    } else {
      var w = o.richtung === 'links' ? -1 : 1;
      linie(m, x, y - r, x, y + r, BREIT);
      linie(m, x, y, x + w * l, y, SCHMAL);
      pfeil(m, x + w * l, y, w, 0);
      txt(m, x + w * (l + 18), y + 5, o.name, {groesse: 17, fett: true});
    }
    return m;
  }

  /* Bruchlinie (Freihand) nach DIN ISO 128-24: schmale Volllinie, unruhig. */
  function bruchlinie(g, x1, x2, y) {
    var n = 6, d = (x2 - x1) / n, p = ['M' + x1 + ',' + y];
    for (var i = 1; i <= n; i++) {
      p.push('L' + (x1 + i * d) + ',' + (y + (i % 2 ? 4 : -4)));
    }
    svgEl('path', {d: p.join(' '), fill: 'none', stroke: 'currentColor',
      'stroke-width': SCHMAL, 'stroke-linejoin': 'round'}, g);
  }

  /* Mittellinie, senkrecht. zeichnen.js kennt nur die waagerechte. */
  function achseV(g, x, y1, y2) {
    linie(g, x, y1, x, y2, SCHMAL, {strich: '12 2 2 2'});
  }

  /* Das Schriftfeld nach DIN EN ISO 7200, 180 mm breit. Maßstab und
     Projektionssymbol stehen nach der Norm außerhalb - hier gleich
     daneben, weil die Zeichnung keinen Vordruck hat. */
  function schriftfeld(g, o) {
    var x = o.x, y = o.y, w = 360, h = 96;
    kasten(g, x, y, w, h);
    linie(g, x, y + 38, x + w, y + 38, SCHMAL);
    linie(g, x + 210, y, x + 210, y + h, SCHMAL);
    txt(g, x + 12, y + 14, 'Benennung', {groesse: 9.5, anker: 'start'});
    txt(g, x + 12, y + 32, o.benennung,
      {groesse: 13.5, anker: 'start', fett: true});
    txt(g, x + 222, y + 14, 'Zeichnungs-Nr.', {groesse: 9.5, anker: 'start'});
    txt(g, x + 222, y + 32, o.nummer, {groesse: 13, anker: 'start'});
    txt(g, x + 12, y + 54, 'Maßstab', {groesse: 9.5, anker: 'start'});
    txt(g, x + 12, y + 72, o.massstab || '1 : 1',
      {groesse: 13, anker: 'start'});
    txt(g, x + 96, y + 54, 'Werkstoff', {groesse: 9.5, anker: 'start'});
    txt(g, x + 96, y + 72, 'siehe Stückliste', {groesse: 11, anker: 'start'});
    txt(g, x + 222, y + 54, 'Blatt', {groesse: 9.5, anker: 'start'});
    txt(g, x + 222, y + 72, '1 von 1', {groesse: 11, anker: 'start'});

    /* Projektionssymbol Methode 1: der Kegel und daneben, auf der Seite,
       von der aus man ihn sieht, seine Ansicht. */
    var px = x + 302, py = y + 68;
    svgEl('path', {d: 'M' + (px - 28) + ',' + (py - 8) + ' L' + (px - 6)
      + ',' + (py - 14) + ' L' + (px - 6) + ',' + (py + 14) + ' L'
      + (px - 28) + ',' + (py + 8) + ' Z', fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    svgEl('ellipse', {cx: px + 14, cy: py, rx: 5, ry: 14, fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    svgEl('ellipse', {cx: px + 14, cy: py, rx: 3, ry: 8, fill: 'none',
      stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    achse(g, px - 34, px + 24, py);
  }

  /* Eine Bohrung im Schnitt: mit Senkung ist es eine Schraube, ohne ein
     Stift. */
  function bohrung(g, cx, cy, r, senkungR, leer) {
    if (senkungR) {
      svgEl('circle', {cx: cx, cy: cy, r: senkungR, fill: leer,
        stroke: 'currentColor', 'stroke-width': SCHMAL}, g);
    }
    svgEl('circle', {cx: cx, cy: cy, r: r, fill: leer,
      stroke: 'currentColor', 'stroke-width': BREIT}, g);
  }

  /* Ein Gewinde in der Ansicht, vereinfacht nach DIN ISO 6410-1: der
     Nenndurchmesser breit, der Kern schmal. */
  function gewindeZapfen(g, xm, yVon, yBis, rNenn, rKern) {
    [-1, 1].forEach(function (v) {
      linie(g, xm + v * rNenn, yVon, xm + v * rNenn, yBis, BREIT);
      linie(g, xm + v * rKern, yVon, xm + v * rKern, yBis, SCHMAL);
    });
    linie(g, xm - rNenn, yBis, xm + rNenn, yBis, BREIT);
  }

  global.Zusammenstellung = {
    schnittTeil: schnittTeil,
    posNr: posNr,
    massVeng: massVeng,
    massHinweis: massHinweis,
    schnittmarke: schnittmarke,
    bruchlinie: bruchlinie,
    achseV: achseV,
    schriftfeld: schriftfeld,
    bohrung: bohrung,
    gewindeZapfen: gewindeZapfen
  };
}(typeof window !== 'undefined' ? window : this));
