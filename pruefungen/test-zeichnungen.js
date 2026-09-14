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
  /* Zonenkarte der Waermeeinflusszone und Verzugsskizze: Fuer Gefuegezonen
     gibt es keine Normdarstellung, und der Verzug ist uebertrieben
     gezeichnet. Beide bleiben deshalb farbig - auch in der Normdarstellung. */
  'svgZonen', 'svgVerzug',
]);

const NOCH_OFFEN = new Set([]);

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

function pruefe(svg, name, rel) {
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

  /* --- Massepfeile: gefuellte Dreiecke oder Marker, nie offene Striche --- */
  const dreiecke = [...svg.querySelectorAll('polygon')].filter((e) =>
    (e.getAttribute('points') || '').trim().split(/\s+/).length === 3
    && (e.getAttribute('fill') || '') !== 'none').length;
  const marker = svg.querySelectorAll('marker').length;
  /* Nur Text der Zeichnung zaehlt - eine Benennung wie "Stifte ⌀ 6"
     in der Erklaerebene ist kein Mass. */
  const zeichentext = [...svg.querySelectorAll('text')]
    .filter((e) => zeichnung(e)).map((e) => e.textContent).join(' ');
  const hatMass = /= *\d|⌀|SW /.test(zeichentext);
  if (hatMass) {
    p(name + ': Massepfeile sind gefuellte Dreiecke', dreiecke > 0 || marker > 0,
      dreiecke + ' Dreiecke, ' + marker + ' Marker');
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
          ? pfadPunkte(e.getAttribute('d') || '')
          : (e.getAttribute('points') || '').trim().split(/\s+/)
              .map((q) => q.split(',').map(Number)).filter((q) => q.length === 2);
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
  const REITER = ['grundlagen', 'aufbau', 'zeichnung', 'funktion', 'fortgeschritten'];
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
    for (const r of REITER) {
      if (!d.getElementById('p-' + r)) continue;
      w.reiterSetzen(r);
      [...d.querySelectorAll('#p-' + r + ' svg')].forEach((svg) => {
        if (KEINE_ZEICHNUNG.has(svg.id)) return;
        if (NOCH_OFFEN.has(svg.id)) {
          console.log('  offen  ' + svg.id + ': sieht aus wie eine Zeichnung, '
            + 'ist aber noch keine');
          return;
        }
        pruefe(svg, datei.split('-')[0] + '/' + r + '/' + svg.id, datei);
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
