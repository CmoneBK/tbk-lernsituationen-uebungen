/* Alle Zeichnungen gegen vorlagen/ZEICHNUNGSREGELN.md.
 *
 * Geprueft wird, was sich maschinell pruefen laesst. Die Seiten werden nicht
 * aufgezaehlt, sondern gefunden - neue Uebungen laufen von selbst mit.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, TOOLS, teilweise } = require('./orte');
const MAT = MATERIAL;

const SCHLUSS = '<' + '/script>';

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* ---------------------------------------------------------------------
   Die Ausnahmen aus Abschnitt 8 der Zeichnungsregeln. Was hier nicht steht,
   muss sich an die Norm halten.
   --------------------------------------------------------------------- */
const KEINE_ZEICHNUNG = new Set([
  /* Diagramme */
  'svgPrinzip', 'svgReib', 'svgAbwickeln', 'svgVergleich', 'svgAufteil',
  'svgStreuband', 'svgVerspann',
  /* Spannung ueber Dehnung mit Entlastungsgeraden - ein Diagramm mit Achsen
     und Kurve, kein Bauteil. Die "bleibende Laengung" darin ist eine
     Ablesehilfe, keine Bemassung. */
  'bildUeberdehnt',
  /* Zonenkarte der Waermeeinflusszone und Verzugsskizze: Fuer Gefuegezonen
     gibt es keine Normdarstellung, und der Verzug ist uebertrieben
     gezeichnet. Beide bleiben deshalb farbig - auch in der Normdarstellung. */
  'svgZonen', 'svgVerzug',
  /* Das Rillenprofil in der Lektion zum Drehprozess: Werkstoff blau,
     die Bahnen der Werkzeugecke als Boegen. Ein Prinzipbild - es
     zeigt, warum die Rautiefe am Quadrat des Vorschubs haengt, und
     stellt kein Bauteil dar. */
  'bildRillen',
  /* Die Messkette in der Prueftechnik: gerundete Kaesten mit Text und
     Pfeilen dazwischen - ein Flussbild vom Bauteil bis zur Anzeige. Es
     stellt kein Bauteil dar, sondern eine Reihenfolge. */
  'svgKette',
  /* Die Zehnerregel: Balken ueber einer logarithmischen Kostenachse. */
  'svgZehner',
  /* Wohin das Anziehdrehmoment geht: eine farbige Anteilsleiste mit
     Prozentzahlen. Die "N.m" darin sind Rechenergebnisse, keine Masse. */
  'svgMomente',
]);



/* Wo der Unterschied der beiden Linienbreiten die Frage selbst ist, wird er
   ueberzeichnet - aber im Verhaeltnis 2:1. */
const UEBERZEICHNET = { bildAussage: [1, 1.7, 2, 3.4] };

/* Absichtlich gleichlaufende Schraffuren: In diesen beiden ist die
   Schraffur die Frage, nicht die Aussage. Beide zeigen auch den falschen
   Fall - sonst gaebe es nichts zu entscheiden. */
const GLEICHE_SCHRAFFUR_ERLAUBT =
  /02-schnittdarstellung-pruefen|03-schraffur-schnellcheck/;

/* ---------------------------------------------------------------------
   Pfadpunkte - mit relativen Befehlen und Kreisbogen.
   --------------------------------------------------------------------- */
const PARAM = { M: 2, L: 2, T: 2, C: 6, S: 4, Q: 4, A: 7, H: 1, V: 1, Z: 0 };
function pfadPunkte(d) {
  const teile = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const punkte = [];
  let i = 0, befehl = 'M', relativ = false, cx = 0, cy = 0;
  while (i < teile.length) {
    if (/^[a-z]$/i.test(teile[i])) {
      relativ = teile[i] === teile[i].toLowerCase() && teile[i] !== 'Z';
      befehl = teile[i].toUpperCase();
      i++;
      continue;
    }
    const n = PARAM[befehl];
    if (n === undefined) { i++; continue; }
    const w = teile.slice(i, i + n).map(Number);
    i += n || 1;
    if (befehl === 'Z') continue;
    if (befehl === 'H') { cx = relativ ? cx + w[0] : w[0]; punkte.push([cx, cy]); continue; }
    if (befehl === 'V') { cy = relativ ? cy + w[0] : w[0]; punkte.push([cx, cy]); continue; }
    if (befehl === 'A') {
      cx = relativ ? cx + w[5] : w[5];
      cy = relativ ? cy + w[6] : w[6];
      punkte.push([cx, cy]);
      continue;
    }
    /* Steuerpunkte duerfen ausserhalb liegen - nur der Endpunkt zaehlt. */
    const ex = w[w.length - 2], ey = w[w.length - 1];
    const nx = relativ ? cx + ex : ex, ny = relativ ? cy + ey : ey;
    punkte.push([nx, ny]);
    cx = nx; cy = ny;
  }
  return punkte;
}

/* Verschiebungen der Elterngruppen mitrechnen. Gedrehte oder skalierte
   Gruppen lassen sich so nicht pruefen - die werden uebersprungen. */
function versatz(e) {
  let dx = 0, dy = 0, k = e;
  while (k && k.tagName !== 'svg') {
    const tr = k.getAttribute && k.getAttribute('transform');
    if (tr) {
      if (/rotate|scale|matrix/.test(tr)) return null;
      const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)?/.exec(tr);
      if (m) { dx += Number(m[1]); dy += Number(m[2] || 0); }
    }
    k = k.parentNode;
  }
  return [dx, dy];
}

const zeichnung = (e) => !e.closest('marker') && !e.closest('pattern')
  && !e.closest('.erklaer');

/* Die Punkte eines polygon/polyline: SVG laesst Komma und Leerzeichen als
   Trenner zu, in beliebiger Mischung. Wer nur am Komma trennt, sieht bei
   "10 20 30 40" gar keine Punkte - und haelt das Vieleck fuer leer. */
function punkteVon(e) {
  const zahlen = (e.getAttribute('points') || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!zahlen) return [];
  const pt = [];
  for (let i = 0; i + 1 < zahlen.length; i += 2) {
    pt.push([Number(zahlen[i]), Number(zahlen[i + 1])]);
  }
  return pt.filter((q) => isFinite(q[0]) && isFinite(q[1]));
}

/* Alle Strecken, die zur Kontur gehoeren: breite Linien, Raender von
   Rechtecken und Pfaden, angenaeherte Kreise. Daran muss eine
   Masshilfslinie ansetzen. Mittellinien zaehlen mit - nach DIN ISO 129 darf
   man von ihnen aus bemassen. */
function konturStrecken(svg, ausser) {
  const aus = [];
  const nimm = (e, punkte) => {
    const v = versatz(e) || [0, 0];
    for (let i = 0; i < punkte.length - 1; i++) {
      aus.push([punkte[i][0] + v[0], punkte[i][1] + v[1],
        punkte[i + 1][0] + v[0], punkte[i + 1][1] + v[1]]);
    }
  };
  svg.querySelectorAll('line, rect, path, circle, ellipse, polygon, polyline')
    .forEach((e) => {
      if (e.closest('marker') || e.closest('pattern')) return;
      /* Was zur Bemassung gehoert, ist keine Kontur. Sonst setzt jede
         Masshilfslinie irgendwo an einer anderen Masslinie an und die
         Pruefung geht immer durch. */
      if (ausser && ausser.has(e)) return;
      if (e.closest('.erklaer')) return;
      const st = e.getAttribute('stroke');
      const fu = e.getAttribute('fill') || 'none';
      if ((!st || st === 'none') && fu === 'none') return;
      if (e.tagName === 'line') {
        nimm(e, [[+e.getAttribute('x1'), +e.getAttribute('y1')],
          [+e.getAttribute('x2'), +e.getAttribute('y2')]]);
      } else if (e.tagName === 'rect') {
        const x = +e.getAttribute('x'), y = +e.getAttribute('y');
        const w = +e.getAttribute('width'), h = +e.getAttribute('height');
        nimm(e, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
      } else if (e.tagName === 'circle' || e.tagName === 'ellipse') {
        const cx = +e.getAttribute('cx'), cy = +e.getAttribute('cy');
        const rx = +(e.getAttribute('rx') || e.getAttribute('r'));
        const ry = +(e.getAttribute('ry') || e.getAttribute('r'));
        const pt = [];
        for (let i = 0; i <= 32; i++) {
          const w = i / 32 * 2 * Math.PI;
          pt.push([cx + rx * Math.cos(w), cy + ry * Math.sin(w)]);
        }
        nimm(e, pt);
      } else if (e.tagName === 'path') {
        nimm(e, pfadPunkte(e.getAttribute('d') || ''));
      } else {
        const pt = punkteVon(e);
        /* Ein polygon ist geschlossen: Die Strecke vom letzten zum ersten
           Punkt gehoert dazu. Ohne sie fehlte jedem Vieleck eine Kante. */
        if (e.tagName === 'polygon' && pt.length > 2) pt.push(pt[0]);
        nimm(e, pt);
      }
    });
  return aus;
}

function pruefe(svg, name, rel) {
  /* Die Ausnahmeliste kennt Bilder unter ihrer Kennung. Im Material haengt
     die am Behaelter, nicht am svg - sonst griffe die Liste dort nie. */
  if (KEINE_ZEICHNUNG.has(svg.id)
    || KEINE_ZEICHNUNG.has(name.split('/').pop())) return;
  const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  const vw = vb[2], vh = vb[3];

  p(name + ': hat eine Beschreibung',
    (svg.getAttribute('aria-label') || '').trim().length > 15);

  /* --- Linienbreiten --- */
  const breiten = new Map();
  svg.querySelectorAll('line,rect,path,circle,polygon,polyline,ellipse').forEach((e) => {
    if (!zeichnung(e)) return;
    const st = e.getAttribute('stroke');
    if (!st || st === 'none') return;
    const w = Number(e.getAttribute('stroke-width') || 1);
    breiten.set(w, (breiten.get(w) || 0) + 1);
  });
  const liste = [...breiten.keys()].sort((a, b) => a - b);
  /* Die Ausnahme haengt am Namen des Bildes, nicht am svg-Element -
     das traegt oft gar keine Kennung. */
  const kurz = svg.id || name.split('/').pop();
  if (UEBERZEICHNET[kurz]) {
    p(name + ': nur die zugelassenen Breiten',
      liste.every((w) => UEBERZEICHNET[kurz].indexOf(w) >= 0), liste.join(', '));
  } else if (liste.length > 2) {
    p(name + ': hoechstens zwei Linienbreiten', false, liste.join(', '));
  } else if (liste.length === 2) {
    p(name + ': Verhaeltnis breit zu schmal ist 2:1',
      Math.abs(liste[1] / liste[0] - 2) < 0.2, liste.join(' / '));
  } else {
    p(name + ': Linienbreiten in Ordnung', true);
  }

  /* --- Bemassung ------------------------------------------------------
     Frueher fragte diese Pruefung nur, ob im Bild irgendwo ein gefuelltes
     Dreieck oder ein Marker vorkommt. Ein Marker steht in den Werkzeugen
     aber schon deshalb im Dokument, weil die Datei ihn beim Start anlegt -
     benutzt ihn keine Masslinie, faellt das nicht auf. Genau so ging ein
     Fehler durch, bei dem alle Pfeile neun Einheiten neben dem Massepunkt
     sassen. Jetzt wird gefragt, was zaehlt. */

  /* Die Spitze eines Pfeils ist die Ecke, die den beiden anderen nicht
     gegenueberliegt: Ein Massepfeil ist lang und schmal, seine Basis ist
     also die kuerzeste der drei Seiten. */
  const spitzeVon = (pt) => {
    const d = (a, b) => Math.hypot(pt[a][0] - pt[b][0], pt[a][1] - pt[b][1]);
    const seiten = [[0, 1, 2], [1, 2, 0], [0, 2, 1]];
    seiten.sort((u, v) => d(u[0], u[1]) - d(v[0], v[1]));
    return pt[seiten[0][2]];
  };
  const dreieckPunkte = (e) => {
    const pt = punkteVon(e);
    return pt.length === 3 ? pt : null;
  };

  /* 1. Der Bezugspunkt eines Markers muss auf der Pfeilspitze liegen. */
  [...svg.querySelectorAll('marker')].forEach((m) => {
    const dr = [...m.querySelectorAll('polygon, path')]
      .map((e) => e.tagName === 'polygon' ? dreieckPunkte(e)
        : (pfadPunkte(e.getAttribute('d') || '').length === 3
          ? pfadPunkte(e.getAttribute('d') || '') : null))
      .filter(Boolean)[0];
    if (!dr) return;
    const sp = spitzeVon(dr);
    const rx = Number(m.getAttribute('refX') || 0);
    const ry = Number(m.getAttribute('refY') || 0);
    p(name + ': Pfeilspitze des Markers ' + m.id + ' liegt auf dem Massepunkt',
      Math.abs(rx - sp[0]) < 0.7 && Math.abs(ry - sp[1]) < 0.7,
      'refX/refY ' + rx + '/' + ry + ', Spitze ' + sp[0] + '/' + sp[1]);
  });

  /* Alle Pfeilspitzen im Bild - als Punkte, egal ob Marker oder Dreieck.

     Nicht jedes gefuellte Dreieck ist eine Pfeilspitze: Eine Rippe im
     Schnittbild ist auch eins, und zwar ein grosses. Gezaehlt wird
     deshalb nur, was die Groesse einer Pfeilspitze hat - `pfeil()` in
     assets/zeichnen.js zeichnet sie 9 Punkte lang und gut 3 breit, also
     keine 10 Punkte von Ecke zu Ecke. Ohne diese Schranke meldete die
     Pruefung die Rippe des Schraffur-Schnellchecks als halb bemasstes
     Mass - und nur dann, wenn das Zufallsbild sie gerade zeigte. */
  const PFEIL_GROESSTE = 14;
  const spitzen = [];
  [...svg.querySelectorAll('polygon')].forEach((e) => {
    if (!zeichnung(e) || (e.getAttribute('fill') || 'none') === 'none') return;
    /* Die Spitze einer Hinweislinie ist kein Masspfeil. Sie sitzt nach
       DIN ISO 128-22 auf der Kontur - wer sie mitzaehlt, meldet die
       danebenliegende Mantellinie als halb bemasztes Mass. Gruppen mit
       der Kennung "hinweis" sagen, was die Spitze bedeutet. */
    if (e.closest('.hinweis')) return;
    /* Ein Schnittpfeil zeigt die Blickrichtung, nicht ein Mass. Er steht
       nach DIN ISO 128-40 allein an seinem Ende der Schnittlinie - ein
       zweiter Pfeil am anderen Ende waere dort schlicht falsch. */
    if (e.closest('.schnittmarke')) return;
    const pt = dreieckPunkte(e);
    if (!pt) return;
    let weit = 0;
    for (let i = 0; i < pt.length; i++) {
      for (let j = i + 1; j < pt.length; j++) {
        weit = Math.max(weit, Math.hypot(pt[i][0] - pt[j][0], pt[i][1] - pt[j][1]));
      }
    }
    if (weit > PFEIL_GROESSTE) return;
    const v = versatz(e) || [0, 0];
    const sp = spitzeVon(pt);
    spitzen.push([sp[0] + v[0], sp[1] + v[1]]);
  });

  /* 2. Wer einen Marker an einem Ende hat, braucht ihn auch am anderen. */
  const mitMarker = [...svg.querySelectorAll('[marker-start], [marker-end]')]
    .filter((e) => zeichnung(e));
  mitMarker.forEach((e) => {
    p(name + ': Masslinie hat an beiden Enden einen Pfeil',
      !!e.getAttribute('marker-start') && !!e.getAttribute('marker-end'),
      (e.getAttribute('marker-start') || 'ohne') + ' / '
      + (e.getAttribute('marker-end') || 'ohne'));
  });

  /* 3. Masslinien: entweder Marker an beiden Enden, oder an beiden Enden
     eine Pfeilspitze. Eine Linie, an deren einem Ende eine Spitze sitzt und
     am anderen nicht, ist halb bemasst - das ist der Fehler, den die alte
     Pruefung nicht sehen konnte. */
  const nah = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 2;
  const masslinien = [];
  [...svg.querySelectorAll('line')].forEach((e) => {
    if (!zeichnung(e)) return;
    const v = versatz(e) || [0, 0];
    const a = [Number(e.getAttribute('x1')) + v[0], Number(e.getAttribute('y1')) + v[1]];
    const b = [Number(e.getAttribute('x2')) + v[0], Number(e.getAttribute('y2')) + v[1]];
    if (e.getAttribute('marker-start') && e.getAttribute('marker-end')) {
      masslinien.push([a, b]);
      return;
    }
    const sa = spitzen.some((q) => nah(q, a)), sb = spitzen.some((q) => nah(q, b));
    if (sa && sb) { masslinien.push([a, b]); return; }
    /* Ein Pfeil an nur einem Ende ist erst dann ein halb bemasstes Mass,
       wenn die Linie auch wie eine Masslinie aussieht: laenger als eine
       Masshilfslinie und waagerecht oder senkrecht. Eine schraege mit einem
       Pfeil ist eine Hinweislinie - die hat nach DIN ISO 128-22 genau einen. */
    const achsparallel = Math.abs(a[0] - b[0]) < 0.5 || Math.abs(a[1] - b[1]) < 0.5;
    const lang = Math.hypot(a[0] - b[0], a[1] - b[1]) >= 18;
    if (sa !== sb && achsparallel && lang) {
      p(name + ': Masslinie hat an beiden Enden einen Pfeil', false,
        'nur an einem Ende: ' + a.map(Math.round) + ' / ' + b.map(Math.round));
    }
  });

  /* Nur Text der Zeichnung zaehlt - eine Benennung wie "Stifte ⌀ 6"
     in der Erklaerebene ist kein Mass. */
  const zeichentext = [...svg.querySelectorAll('text')]
    .filter((e) => zeichnung(e)).map((e) => e.textContent).join(' ');
  const hatMass = /= *\d|⌀|SW /.test(zeichentext);
  if (hatMass) {
    p(name + ': zu den Masszahlen gibt es Masslinien mit Pfeilen',
      masslinien.length > 0, masslinien.length + ' Masslinien');
  }

  /* 4. Masshilfslinien setzen an der Kontur an. Eine, die im Nichts
     anfaengt, bemasst nichts. */

  /* Erst sammeln, was zur Bemassung gehoert: die Masslinien selbst, ihre
     Hilfslinien und alles, was einen Marker traegt. Nur der Rest ist
     Kontur. */
  const bemassung = new Set(mitMarker);
  const alleLinien = [...svg.querySelectorAll('line')].filter(zeichnung);
  const endenVon = (h) => {
    const v = versatz(h) || [0, 0];
    return [[Number(h.getAttribute('x1')) + v[0], Number(h.getAttribute('y1')) + v[1]],
      [Number(h.getAttribute('x2')) + v[0], Number(h.getAttribute('y2')) + v[1]]];
  };
  alleLinien.forEach((h) => {
    const [p1, p2] = endenVon(h);
    if (spitzen.some((q) => nah(q, p1)) || spitzen.some((q) => nah(q, p2))) {
      bemassung.add(h);
    }
  });
  /* Die Hilfslinien: quer zu einer Masslinie, mit einem Ende an deren
     Endpunkt. */
  /* Zu welchem Mass gehoert die Linie? Die Masszahl steht in der Naehe
     ihrer Mitte. Ohne sie muesste man bei jedem Befund raten. */
  const texte = [...svg.querySelectorAll('text')].filter(zeichnung).map((e) => {
    const v = versatz(e) || [0, 0];
    return [Number(e.getAttribute('x')) + v[0], Number(e.getAttribute('y')) + v[1],
      (e.textContent || '').trim()];
  });
  const massZu = (a, b) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let best = null, bd = 60;
    texte.forEach((t) => {
      const d = Math.hypot(t[0] - mx, t[1] - my);
      if (d < bd) { bd = d; best = t[2]; }
    });
    return best ? '"' + best + '"' : 'ohne Masszahl';
  };

  const hilfslinien = [];
  masslinien.forEach(([a, b]) => {
    const rx = b[0] - a[0], ry = b[1] - a[1];
    const rl = Math.hypot(rx, ry) || 1;
    [a, b].forEach((ende) => {
      alleLinien.forEach((h) => {
        /* Eine Masshilfslinie ist eine durchgezogene schmale Linie. Eine
           Mittellinie laeuft oft genauso quer zur Masslinie und endet in der
           Naehe - sie ist aber gestrichelt und bemasst nichts. */
        if (h.getAttribute('stroke-dasharray')) return;
        const [p1, p2] = endenVon(h);
        const hx = p2[0] - p1[0], hy = p2[1] - p1[1];
        const hl = Math.hypot(hx, hy) || 1;
        if (Math.abs((rx * hx + ry * hy) / (rl * hl)) >= 0.35) return;
        const d1 = Math.hypot(p1[0] - ende[0], p1[1] - ende[1]);
        const d2 = Math.hypot(p2[0] - ende[0], p2[1] - ende[1]);
        if (Math.min(d1, d2) > 10) return;
        bemassung.add(h);
        hilfslinien.push([h, d1 < d2 ? p2 : p1, massZu(a, b)]);
      });
    });
  });

  const strecken = konturStrecken(svg, bemassung);
  const abstand = (pkt, st) => {
    const [x, y] = pkt, [x1, y1, x2, y2] = st;
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / l2)) : 0;
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
  };
  /* Zwei Einheiten Spielraum: Eine breite Kante ist selbst zwei Einheiten
     dick, ihre Mittellinie liegt also bis zu einer Einheit neben dem, was
     man sieht. Die echten Befunde lagen zwischen vier und fuenfunddreissig
     Einheiten daneben. */
  const anKontur = (pkt) => strecken.some((st) => abstand(pkt, st) < 2.2);

  hilfslinien.forEach(([h, fern, wozu]) => {
    p(name + ': Masshilfslinie setzt an der Kontur an', anKontur(fern),
      wozu + ', freies Ende bei ' + fern.map(Math.round));
  });

  /* --- Hinweislinien der Positionsnummern ---
     Nach DIN EN ISO 6433 stehen Positionsnummern uebersichtlich. Zwei
     Hinweislinien, die einander kreuzen, sind das Gegenteil davon: An der
     Kreuzung weiss niemand mehr, welche Linie zu welcher Nummer gehoert.

     Uebersichtlich wird es, wenn die Marken in derselben Reihenfolge stehen
     wie die Stellen, auf die sie zeigen. Das ist aber nur eine Faustregel -
     ob es stimmt, entscheidet die Rechnung. */
  const hinweise = [...svg.querySelectorAll('.posnr')].map((g) => {
    const l = g.querySelector('line');
    const t = g.querySelector('text');
    if (!l || !t) return null;
    return { nr: t.textContent,
      a: { x: +l.getAttribute('x1'), y: +l.getAttribute('y1') },
      b: { x: +l.getAttribute('x2'), y: +l.getAttribute('y2') } };
  }).filter(Boolean);

  const seite = (a, b, c) =>
    Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  const kreuzen = (p1, q1, p2, q2) =>
    seite(p1, q1, p2) !== seite(p1, q1, q2)
    && seite(p2, q2, p1) !== seite(p2, q2, q1);

  const gekreuzt = [];
  hinweise.forEach((h, i) => hinweise.slice(i + 1).forEach((k) => {
    if (kreuzen(h.a, h.b, k.a, k.b)) gekreuzt.push(h.nr + '/' + k.nr);
  }));
  if (hinweise.length > 1) {
    p(name + ': keine Hinweislinie kreuzt eine andere',
      !gekreuzt.length, gekreuzt.join(', '));
  }

  /* --- Schraffuren gegenlaeufig ---
     Falsch ist nicht "zwei gleiche Muster im Bild", sondern "zwei gleiche
     Muster an Teilen, die aneinander liegen". Ein Bild mit zwei getrennten
     Szenen darf beide Male dieselbe Richtung nehmen. */
  const winkelVon = {};
  svg.querySelectorAll('pattern').forEach((e) => {
    const m = (e.getAttribute('patternTransform') || '').match(/-?\d+/);
    /* DIN ISO 128-50 laesst benachbarte Teile "gegenlaeufig ODER versetzt"
       zu - gleicher Winkel bei anderem Abstand ist also in Ordnung. Der
       Abstand steckt in der Kachelbreite. */
    if (m) winkelVon[e.id] = m[0] + '@' + (e.getAttribute('width') || '?');
  });
  /* Geprueft wird jede Form, die eine Schraffur traegt - auch Kreise und
     Vielecke. Vorher standen hier nur rect und path; Querschnitte fielen
     damit stillschweigend aus der Pruefung. */
  const schraffiert = [...svg.querySelectorAll(
    'rect,path,circle,ellipse,polygon,polyline')].filter((e) =>
    /^url\(#/.test(e.getAttribute('fill') || '')).map((e) => {
      const id = (e.getAttribute('fill') || '').slice(5, -1);
      const v = versatz(e) || [0, 0];
      let x1, y1, x2, y2;
      if (e.tagName === 'rect') {
        x1 = +e.getAttribute('x'); y1 = +e.getAttribute('y');
        x2 = x1 + +e.getAttribute('width'); y2 = y1 + +e.getAttribute('height');
      } else if (e.tagName === 'circle' || e.tagName === 'ellipse') {
        const cx = +e.getAttribute('cx'), cy = +e.getAttribute('cy');
        const rx = +(e.getAttribute('rx') || e.getAttribute('r'));
        const ry = +(e.getAttribute('ry') || e.getAttribute('r'));
        x1 = cx - rx; x2 = cx + rx; y1 = cy - ry; y2 = cy + ry;
      } else {
        const pt = e.tagName === 'path'
          ? pfadPunkte(e.getAttribute('d') || '') : punkteVon(e);
        if (!pt.length) return null;
        x1 = Math.min(...pt.map((q) => q[0])); x2 = Math.max(...pt.map((q) => q[0]));
        y1 = Math.min(...pt.map((q) => q[1])); y2 = Math.max(...pt.map((q) => q[1]));
      }
      return { id, w: winkelVon[id], x1: x1 + v[0], x2: x2 + v[0],
        y1: y1 + v[1], y2: y2 + v[1] };
    }).filter((e) => e && e.w !== undefined);

  const beruehrt = (a, b) => {
    const ueberX = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 1;
    const ueberY = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > 1;
    const nahX = Math.abs(a.x2 - b.x1) < 3 || Math.abs(b.x2 - a.x1) < 3;
    const nahY = Math.abs(a.y2 - b.y1) < 3 || Math.abs(b.y2 - a.y1) < 3;
    /* Stoss an Stoss, oder die Felder liegen ineinander: Eine Welle im
       Querschnitt steckt vollstaendig in der Nabe und beruehrt sie doch. */
    return (ueberX && nahY) || (ueberY && nahX) || (ueberX && ueberY);
  };
  const gleich = [];
  for (let i = 0; i < schraffiert.length; i++) {
    for (let j = i + 1; j < schraffiert.length; j++) {
      const a = schraffiert[i], b = schraffiert[j];
      /* Dieselbe Schraffur bedeutet dasselbe Teil - ein Bauteil darf aus
         mehreren Flaechen bestehen. Ein Fehler sind zwei verschiedene
         Muster mit derselben Richtung. */
      if (a.id === b.id || a.w !== b.w) continue;
      if (beruehrt(a, b)) gleich.push(a.id + ' / ' + b.id);
    }
  }
  if (schraffiert.length >= 2 && !GLEICHE_SCHRAFFUR_ERLAUBT.test(rel)) {
    p(name + ': benachbarte Teile gegenlaeufig schraffiert', !gleich.length,
      gleich.slice(0, 3).join(', '));
  }

  /* --- Mittellinien: einheitliches Strichbild --- */
  const bilder = new Set([...svg.querySelectorAll('[stroke-dasharray]')]
    .filter((e) => zeichnung(e)
      && (e.getAttribute('stroke-dasharray') || '').split(/[\s,]+/).length >= 4)
    .map((e) => e.getAttribute('stroke-dasharray').trim()));
  if (bilder.size) {
    p(name + ': ein Strichbild fuer alle Mittellinien', bilder.size === 1,
      [...bilder].join(' | '));
  }

  /* --- Deckende Flaechen duerfen keine breite Kante anknabbern ---
     Eine Flaeche ohne eigene Kante (fill gesetzt, stroke none), die nach
     einer breiten Vollinie kommt und deren Rand beruehrt, nimmt ihr die
     halbe Strichbreite weg. Im Bild wird aus der breiten Kante eine schmale.
     Deckende Flaechen gehoeren deshalb VOR das, was sie verdecken. */
  const alle = [...svg.querySelectorAll('line,rect,path,polygon')]
    .filter((e) => zeichnung(e));
  const kasten = (e) => {
    const v = versatz(e);
    if (!v) return null;
    let xs = [], ys = [];
    if (e.tagName === 'line') {
      xs = [+e.getAttribute('x1'), +e.getAttribute('x2')];
      ys = [+e.getAttribute('y1'), +e.getAttribute('y2')];
    } else if (e.tagName === 'rect') {
      xs = [+e.getAttribute('x'), +e.getAttribute('x') + +e.getAttribute('width')];
      ys = [+e.getAttribute('y'), +e.getAttribute('y') + +e.getAttribute('height')];
    } else if (e.tagName === 'path') {
      const pt = pfadPunkte(e.getAttribute('d') || '');
      if (!pt.length) return null;
      xs = pt.map((q) => q[0]); ys = pt.map((q) => q[1]);
    } else {
      const z = (e.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < z.length; i += 2) { xs.push(z[i]); ys.push(z[i + 1]); }
      if (!xs.length) return null;
    }
    return { x1: Math.min(...xs) + v[0], x2: Math.max(...xs) + v[0],
      y1: Math.min(...ys) + v[1], y2: Math.max(...ys) + v[1] };
  };
  const deckend = (e) => {
    const f = e.getAttribute('fill');
    const st = e.getAttribute('stroke');
    return f && f !== 'none' && !/^url\(/.test(f) && (!st || st === 'none');
  };
  /* Eingegrenzt auf den Umriss eines Sechskants: ein geschlossener Pfad mit
     sechs Punkten, breit gezeichnet, ohne Fuellung. Eine deckende Flaeche,
     die ueber einem Bauteil liegt, ist erlaubt und normal - beim Kopf ist
     sie es nicht, denn der liegt vorne. */
  const breiteKante = (e) => {
    if (e.tagName !== 'path') return false;
    const st = e.getAttribute('stroke');
    if (!st || st === 'none') return false;
    if (Number(e.getAttribute('stroke-width') || 1) < 1.8) return false;
    if ((e.getAttribute('fill') || 'none') !== 'none') return false;
    const d = e.getAttribute('d') || '';
    return ((d.match(/L/g) || []).length === 5) && /Z\s*$/.test(d);
  };
  const angeknabbert = [];
  alle.forEach((e, i) => {
    if (!deckend(e)) return;
    const a = kasten(e);
    if (!a) return;
    for (let j = 0; j < i; j++) {
      if (!breiteKante(alle[j])) continue;
      const b = kasten(alle[j]);
      if (!b) continue;
      /* Beruehrt heisst: Die Flaeche beginnt genau auf der Kante. */
      const beruehrtX = (Math.abs(a.x1 - b.x1) < 0.6 || Math.abs(a.x1 - b.x2) < 0.6
        || Math.abs(a.x2 - b.x1) < 0.6 || Math.abs(a.x2 - b.x2) < 0.6);
      const beruehrtY = (Math.abs(a.y1 - b.y1) < 0.6 || Math.abs(a.y1 - b.y2) < 0.6
        || Math.abs(a.y2 - b.y1) < 0.6 || Math.abs(a.y2 - b.y2) < 0.6);
      const ueberlappt = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 1
        && Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > 1;
      if (ueberlappt && (beruehrtX || beruehrtY)) {
        angeknabbert.push(e.tagName + ' deckt ' + alle[j].tagName
          + ' bei ' + Math.round(b.x1) + '/' + Math.round(b.y1));
        return;
      }
    }
  });
  p(name + ': keine breite Kante nachtraeglich zugedeckt', !angeknabbert.length,
    angeknabbert.slice(0, 3).join(', '));

  /* --- Alles im Rahmen --- */
  const raus = [];
  svg.querySelectorAll('line,rect,text,circle,path,polygon').forEach((e) => {
    if (!zeichnung(e)) return;
    const v = versatz(e);
    if (!v) return;
    const test = (x, y) => {
      if (x + v[0] < -3 || x + v[0] > vw + 3 || y + v[1] < -3 || y + v[1] > vh + 3) {
        raus.push(e.tagName + ' ' + Math.round(x + v[0]) + '/' + Math.round(y + v[1]));
      }
    };
    if (e.tagName === 'line') {
      test(+e.getAttribute('x1'), +e.getAttribute('y1'));
      test(+e.getAttribute('x2'), +e.getAttribute('y2'));
    } else if (e.tagName === 'rect') {
      test(+e.getAttribute('x'), +e.getAttribute('y'));
      test(+e.getAttribute('x') + +e.getAttribute('width'),
        +e.getAttribute('y') + +e.getAttribute('height'));
    } else if (e.tagName === 'text') {
      /* Nicht nur der Ankerpunkt zaehlt: Ein rechtsbuendiger Text laeuft
         nach links weg und kann dort aus dem Bild fallen, obwohl sein Anker
         noch drin liegt. Die Breite wird aus Zeichenzahl und Schriftgroesse
         geschaetzt. */
      const gr = Number(e.getAttribute('font-size') || 12);
      const br = (e.textContent || '').length * gr * 0.55;
      const anker = e.getAttribute('text-anchor') || 'start';
      const x = +e.getAttribute('x'), y = +e.getAttribute('y');
      const links = anker === 'end' ? x - br : (anker === 'middle' ? x - br / 2 : x);
      if (!/rotate/.test(e.getAttribute('transform') || '')) {
        test(links, y);
        test(links + br, y);
      } else {
        test(x, y);
      }
    } else if (e.tagName === 'circle') {
      test(+e.getAttribute('cx'), +e.getAttribute('cy'));
    } else if (e.tagName === 'path') {
      pfadPunkte(e.getAttribute('d') || '').forEach(([x, y]) => test(x, y));
    } else if (e.tagName === 'polygon') {
      const z = (e.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < z.length; i += 2) test(z[i], z[i + 1]);
    }
  });
  p(name + ': alles im Rahmen', !raus.length, raus.slice(0, 3).join(', '));
}

/* --------------------------------------------------------------------- */
function einsetzen(html, wurzel, praefix) {
  return html.replace(
    new RegExp('<script src="' + praefix + '(assets/[a-z-]+\\.js)"[^>]*></script>', 'g'),
    (ganz, datei) => {
      if (/thema\.js/.test(datei)) return '';
      const q = path.join(wurzel, datei);
      if (!fs.existsSync(q)) return ganz;
      return '<script>' + fs.readFileSync(q, 'utf8').split(SCHLUSS).join('<\\' + '/script>')
        + SCHLUSS;
    });
}

function laden(datei, wurzel, praefix, url) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(einsetzen(fs.readFileSync(datei, 'utf8'), wurzel, praefix), {
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true, url,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  return { dom, d: dom.window.document, w: dom.window, laut };
}

const warte = (ms) => new Promise((l) => setTimeout(l, ms));

/* Seiten suchen statt aufzaehlen. */
function seiten(unter) {
  const gefunden = [];
  const gehen = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const q = path.join(ordner, e.name);
      /* Fremdes ueberspringen: node_modules gehoert nicht zum Material, und
         jsdom bringt selbst hunderte HTML-Dateien mit. */
      if (e.isDirectory() && /^(node_modules|\.git)$/.test(e.name)) continue;
      if (e.isDirectory()) gehen(q);
      else if (e.name.endsWith('.html') && e.name !== 'index.html'
        || (e.name === 'index.html' && /lernsituationen/.test(ordner))) {
        if (/zeichnen\.js/.test(fs.readFileSync(q, 'utf8'))) gefunden.push(q);
      }
    }
  };
  gehen(path.join(MAT, unter));
  return gefunden;
}

async function main() {
  console.log('\nZeichnungen im Material');
  for (const unter of ['uebungen', 'trainings', 'lernsituationen']) {
    for (const datei of seiten(unter)) {
      const rel = path.relative(MAT, datei).split(path.sep).join('/');
      const { d, laut } = laden(datei, MAT, '(?:\\.\\./)+',
        'https://t-bk.de/unterrichtsmaterial/' + rel);
      await warte(700);
      p(rel + ': laedt ohne Fehler', !laut.length, laut.join(' | '));
      const svgs = [...d.querySelectorAll('main svg')];
      p(rel + ': hat Zeichnungen', svgs.length > 0);
      svgs.forEach((svg, i) => {
        const eltern = svg.closest('[id]');
        pruefe(svg, rel.split('/').pop().replace('.html', '') + '/'
          + ((eltern && eltern.id) || ('bild' + i)), rel);
      });
    }
  }

  console.log('\nZeichnungen in den Lektionen');
  /* Frueher stand hier eine feste Liste von Reiternamen. Eine Lektion mit
     eigenen Namen fiel damit stillschweigend durch die Pruefung - deshalb
     werden die Reiter jetzt aus der Seite gelesen. */
  const REITER_ERSATZ = ['grundlagen', 'aufbau', 'zeichnung', 'funktion',
    'fortgeschritten'];
  /* Die Werkzeuge liegen im Nachbar-Repo. Fehlt es, bleibt der Rest dieser
     Pruefung trotzdem gueltig. */
  const werkzeuge = teilweise(TOOLS, 'Werkzeuge')
    ? fs.readdirSync(TOOLS).filter((f) => f.endsWith('.html')) : [];
  for (const datei of werkzeuge) {
    const q = path.join(TOOLS, datei);
    if (!/reiterSetzen/.test(fs.readFileSync(q, 'utf8'))) continue;
    const { d, w, laut } = laden(q, TOOLS, '', 'https://t-bk.de/werkzeuge/tools/' + datei);
    await warte(900);
    if (laut.length) p(datei + ': laedt ohne Fehler', false, laut[0]);
    const eigene = [...d.querySelectorAll('.tabs button[data-tab]')]
      .map((b) => b.getAttribute('data-tab'));
    for (const r of (eigene.length ? eigene : REITER_ERSATZ)) {
      if (!d.getElementById('p-' + r)) continue;
      w.reiterSetzen(r);
      [...d.querySelectorAll('#p-' + r + ' svg')].forEach((svg, i) => {
        /* Manche Bilder tragen ihre Kennung am umgebenden figure, nicht am
           svg selbst - sonst stuende hier ein leerer Name, und keine Ausnahme
           wuerde greifen. */
        const rahmen = svg.closest('figure');
        const kennung = svg.id || (rahmen && rahmen.id) || ('bild' + i);
        const voll = datei.split('-')[0] + '/' + r + '/' + kennung;
        if (KEINE_ZEICHNUNG.has(kennung) || KEINE_ZEICHNUNG.has(voll)) return;
        pruefe(svg, voll, datei);
      });
    }
  }

  /* jsdom laesst die Fenster offen - ohne ein ausdrueckliches Ende
     bliebe der Prozess haengen, obwohl die Pruefung durch ist.
     Beendet wird erst, wenn die Ausgabe geschrieben ist. */
  process.stdout.write('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen')
    + '\n', function(){ process.exit(fehler ? 1 : 0); });
}

main();
