/* Das Material zum Löten und Kleben.
 *
 * Drei Fragen, in dieser Reihenfolge:
 *   1. Stehen dieselben Zahlen in den Seiten wie im Tabellenbuch? Die Werte
 *      sind an drei Stellen abgeschrieben - in der Lektion, in den Übungen
 *      und in den Trainings. Weicht eine ab, merkt es sonst niemand.
 *   2. Nimmt jede Übung die richtige Lösung an?
 *   3. Läuft jedes Training auf jeder Stufe komplett durch?
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { BASIS, mitAssets, fertig } = require('./harness');
const { TOOLS } = require('./orte');

const SCHLUSS = '<' + '/script>';

/* Dasselbe, was mitAssets fuer das Materialrepo tut - nur aus tools/assets. */
function mitWerkzeugAssets(html) {
  return html.replace(
    /<script src="(assets\/[a-z-]+\.js)"[^>]*><\/script>/g,
    (ganz, datei) => {
      const voll = path.join(TOOLS, datei);
      if (!fs.existsSync(voll)) return '';
      const quelle = fs.readFileSync(voll, 'utf8')
        .split(SCHLUSS).join('<\\' + '/script>');
      return '<script>' + quelle + SCHLUSS;
    });
}

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const TB_DATEI = path.join(BASIS, 'tabellenbuch', 'daten.json');
const TB = fs.existsSync(TB_DATEI)
  ? JSON.parse(fs.readFileSync(TB_DATEI, 'utf8')) : null;

/* Die Seiten des Werkzeugrepos liegen woanders und brauchen keine
   Materialbausteine. */
async function seite(rel, wurzel) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push(String((e.detail && e.detail.message) || e.message)));
  const voll = path.join(wurzel || BASIS, rel);
  const roh = fs.readFileSync(voll, 'utf8');
  const dom = new JSDOM(wurzel ? mitWerkzeugAssets(roh) : mitAssets(roh), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: (wurzel ? 'https://t-bk.de/werkzeuge/' : 'https://t-bk.de/unterrichtsmaterial/') + rel,
    beforeParse(w) {
      w.Element.prototype.scrollIntoView = function () {};
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
    },
  });
  await fertig(dom);
  return { w: dom.window, d: dom.window.document, laut };
}

/* ---------------------------------------------------------------------
   1. Die Zahlen gegen das Tabellenbuch
   --------------------------------------------------------------------- */
function spaltVergleich(name, LOTE, SPALT) {
  const soll = TB.loetverbindungen.loetspaltbreiten_mm;
  const abw = [];
  if (LOTE.join('|') !== soll._spalten.join('|')) {
    abw.push('Spaltenköpfe: ' + LOTE.join(', '));
  }
  Object.keys(SPALT).forEach((w) => {
    if (!soll[w]) { abw.push(w + ': steht nicht im Buch'); return; }
    SPALT[w].forEach((v, i) => {
      if (v !== soll[w][i]) {
        abw.push(w + ' / ' + LOTE[i] + ': ' + v + ' statt ' + soll[w][i]);
      }
    });
  });
  Object.keys(soll).filter((k) => k[0] !== '_').forEach((w) => {
    if (!SPALT[w]) abw.push(w + ': Zeile fehlt');
  });
  p(name + ': Lötspaltbreiten wie im Tabellenbuch', !abw.length, abw.join(' · '));
}

function einteilungVergleich(name, SPALTEN, ZEILEN) {
  const soll = TB.loetverbindungen.einteilung;
  const abw = [];
  if (SPALTEN.join('|') !== soll._spalten.join('|')) {
    abw.push('Spalten: ' + SPALTEN.join(', '));
  }
  /* Die Seite formuliert "unter 450 °C", das Buch "< 450 °C" - verglichen
     werden deshalb die Zahlen, nicht die Zeichen. */
  const zahlen = (s) => (String(s).match(/\d+/g) || []).join(',');
  const felder = { Arbeitstemperatur: 'arbeitstemperatur' };
  ZEILEN.forEach((z) => {
    const k = felder[z.name];
    if (!k) return;
    z.werte.forEach((v, i) => {
      if (zahlen(v) !== zahlen(soll[k][i])) {
        abw.push(z.name + ' / ' + SPALTEN[i] + ': ' + v + ' statt ' + soll[k][i]);
      }
    });
  });
  p(name + ': Einteilung wie im Tabellenbuch', !abw.length, abw.join(' · '));
}

function loteVergleich(name, LOTE) {
  const alle = [].concat(TB.hartlote.silberhaltige_lote,
    TB.hartlote.kupferbasislote, TB.hartlote.aluminiumbasislote);
  const abw = [];
  LOTE.forEach((l) => {
    const soll = alle.filter((x) => x.kurzzeichen === l.kurz)[0];
    if (!soll) { abw.push(l.kurz + ': steht nicht im Buch'); return; }
    if (soll.arbeitstemperatur_c !== l.temp) {
      abw.push(l.kurz + ': ' + l.temp + ' statt ' + soll.arbeitstemperatur_c + ' °C');
    }
    if (String(soll.loetstoss) !== l.stoss) {
      abw.push(l.kurz + ': Lötstoß ' + l.stoss + ' statt ' + soll.loetstoss);
    }
  });
  p(name + ': Hartlote wie im Tabellenbuch', !abw.length, abw.join(' · '));
}

function kleberVergleich(name, KLEBER) {
  const soll = TB.klebstoffe.eigenschaften;
  /* Aus "6…30" und "20" die beiden Grenzen. */
  const grenzen = (s) => {
    const t = String(s).split('…');
    return [Number(t[0]), Number(t[t.length - 1])];
  };
  const abw = [];
  KLEBER.forEach((k) => {
    const s = soll.filter((x) => x.klebstoff === k.name)[0];
    if (!s) { abw.push(k.name + ': steht nicht im Buch'); return; }
    const g = grenzen(s.zugscherfestigkeit_n_mm2);
    if (g[0] !== k.tauVon || g[1] !== k.tauBis) {
      abw.push(k.name + ': τ = ' + k.tauVon + '…' + k.tauBis + ' statt '
        + s.zugscherfestigkeit_n_mm2);
    }
    /* Die Seiten führen eine Zahl; das Buch schreibt teils "50…150" oder
       "80, kurzzeitig bis 150". Verglichen wird die obere Dauergrenze. */
    const t = String(s.max_betriebstemperatur_c).replace(/,.*$/, '');
    const oben = Number(t.split('…').pop());
    if (oben !== k.tempMax) {
      abw.push(k.name + ': ' + k.tempMax + ' statt ' + oben + ' °C');
    }
    if (s.elastizitaet !== k.elastisch) {
      abw.push(k.name + ': Elastizität ' + k.elastisch + ' statt ' + s.elastizitaet);
    }
  });
  p(name + ': Klebstoffe wie im Tabellenbuch', !abw.length, abw.join(' · '));
}

function flussmittelVergleich(name, w) {
  const soll = TB.flussmittel.weichloeten;
  const abw = [];
  const typen = Object.keys(soll.typen);
  w.TYP.forEach((t, i) => {
    const erwartet = typen[i];                 /* "1 Harz" */
    if (erwartet.indexOf(t[0]) !== 0 || erwartet.indexOf(t[1]) < 0) {
      abw.push('Typ ' + t.join(' ') + ' statt ' + erwartet);
    }
    soll.typen[erwartet].forEach((b, j) => {   /* "1 Kolophonium" */
      const da = w.BASIS[t[0]][j];
      if (!da || b.indexOf(da[0]) !== 0 || b.indexOf(da[1]) < 0) {
        abw.push('Basis ' + (da ? da.join(' ') : '–') + ' statt ' + b);
      }
    });
  });
  Object.keys(soll.halogenidmassenanteil).forEach((k, i) => {
    const da = w.HAL[i];
    /* "< 0,01 %" gegen "unter 0,01 %": verglichen werden die Ziffern. */
    const zahlen = (s) => (String(s).match(/[\d,]+/g) || []).join(',');
    if (!da || da[0] !== k
        || zahlen(da[1]) !== zahlen(soll.halogenidmassenanteil[k])) {
      abw.push('Halogenid ' + (da ? da.join(' ') : '–') + ' statt '
        + k + ' ' + soll.halogenidmassenanteil[k]);
    }
  });
  /* Eine Kennzahl kann im Buch in zwei Zeilen stehen: 311 ist dort sowohl
     bedingt als auch stark korrodierend. Wer sie eindeutig zuordnet, sagt
     mehr, als die Tabelle hergibt - deshalb wird zuerst gesammelt, welche
     Wirkungen das Buch je Kennzahl nennt. */
  const buch = new Map();
  Object.keys(soll.rueckstaende).forEach((schluessel) => {
    schluessel.split(/[/,]/).map((s) => s.trim()).filter(Boolean).forEach((k) => {
      if (!buch.has(k)) buch.set(k, []);
      buch.get(k).push(soll.rueckstaende[schluessel]);
    });
  });
  for (const [k, wirkungen] of buch) {
    const da = w.RUECKSTAND[k];
    if (wirkungen.length === 1) {
      if (da !== wirkungen[0]) {
        abw.push(k + ': ' + da + ' statt ' + wirkungen[0]);
      }
    } else if (da !== undefined
        && !wirkungen.every((x) => da.indexOf(x.split(' ')[0]) >= 0)) {
      /* Zweideutig: Entweder die Seite lässt die Kennzahl weg, oder sie
         nennt beide Wirkungen. Eine einzelne wäre falsch. */
      abw.push(k + ': "' + da + '" – das Buch nennt ' + wirkungen.join(' und '));
    }
  }
  p(name + ': Flussmittel-Kennzeichen wie im Tabellenbuch', !abw.length,
    abw.join(' · '));
}

/* ---------------------------------------------------------------------
   3. Trainings durchspielen
   --------------------------------------------------------------------- */
async function trainingDurchspielen(rel, stufen, wahlNr) {
  for (const stufe of stufen) {
    const { w, d, laut } = await seite(rel);
    d.getElementById('stufe').value = stufe;
    d.getElementById('stufe').dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('umfang').value = '5';
    d.getElementById('umfang').dispatchEvent(new w.Event('change', { bubbles: true }));

    for (let i = 0; i < w.runde.length; i++) {
      const knoepfe = [...d.querySelectorAll('#wahl button')];
      const k = knoepfe[wahlNr(w.runde[w.nr])];
      if (!k) { p(rel + ' [' + stufe + ']', false, 'keine richtige Antwort dabei'); break; }
      k.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      d.getElementById('btnWeiter').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    }
    const bilanz = d.getElementById('bilanz').textContent;
    p(rel.split('/').pop() + ' [' + stufe + ']: alles richtig',
      /^5 von 5 richtig/.test(bilanz) && !laut.length, bilanz + (laut[0] || ''));
  }
}

async function main() {
  if (!TB) {
    console.log('  tabellenbuch/daten.json fehlt – der Zahlenvergleich entfällt');
  }

  console.log('\nDie Lektion');
  {
    const { w, d, laut } = await seite(
      'fertigungstechnik-fuegeverfahren-loeten-kleben.html', TOOLS);
    p('Lektion lädt ohne Fehler', !laut.length, laut[0]);
    p('alle fünf Reiter sind da',
      d.querySelectorAll('.tabs button').length === 5,
      d.querySelectorAll('.tabs button').length + ' Reiter');
    p('die drei Zeichnungen sind gezeichnet',
      d.querySelectorAll('figure svg').length === 3,
      d.querySelectorAll('figure svg').length + ' Bilder');
    p('die Lottabelle zeigt Zeilen',
      d.querySelectorAll('#tabLote tr').length > 3);
    p('die Klebstofftabelle zeigt Zeilen',
      d.querySelectorAll('#tabKleber tr').length > 3);
    if (TB) {
      spaltVergleich('Lektion', w.SPALT_LOTE, w.SPALT);
      /* Die Lektion haelt die Einteilung spaltenweise, die Pruefung
         zeilenweise - hier wird umgesteckt. */
      const klar = (s) => String(s).replace(/&ouml;/g, 'ö')
        .replace(/&szlig;/g, 'ß').replace(/&auml;/g, 'ä')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&deg;/g, '°');
      einteilungVergleich('Lektion', w.VERFAHREN.map((v) => klar(v.name)),
        [{ name: 'Arbeitstemperatur',
           werte: w.VERFAHREN.map((v) => klar(v.temperatur)) }]);
      loteVergleich('Lektion', w.HARTLOTE);
      kleberVergleich('Lektion', w.KLEBER);
      flussmittelVergleich('Lektion', { TYP: w.FM_TYP, BASIS: w.FM_BASIS,
        HAL: w.FM_HAL, RUECKSTAND: w.FM_RUECKSTAND });
    }
    /* Die Regel fuer die Loettiefe steht in den Gestaltungsregeln. */
    d.getElementById('spS').value = '3';
    d.getElementById('spS').dispatchEvent(new w.Event('input', { bubbles: true }));
    p('Löttiefe rechnet 5 · s',
      /15,0 mm/.test(d.getElementById('spTiefe').textContent),
      d.getElementById('spTiefe').textContent.replace(/\s+/g, ' ').slice(0, 80));
  }

  console.log('\nDie Übungen');
  {
    const { w, d, laut } = await seite(
      'uebungen/loeten-kleben/01-loeten-schweissen-oder-kleben.html');
    p('01 lädt ohne Fehler', !laut.length, laut[0]);
    w.FAELLE.forEach((f) => {
      d.getElementById('v' + f.id).value = f.verfahren;
      d.getElementById('s' + f.id).value = f.sperre;
    });
    d.getElementById('btnPruefen')
      .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    p('01: die richtige Lösung wird angenommen',
      /4 von 4 vollständig richtig/.test(d.getElementById('rueck').textContent),
      d.getElementById('rueck').textContent.slice(0, 60));
  }
  {
    const { w, d, laut } = await seite(
      'uebungen/loeten-kleben/02-den-loetspalt-waehlen.html');
    p('02 lädt ohne Fehler', !laut.length, laut[0]);
    if (TB) spaltVergleich('Übung 02', w.SPALT_LOTE, w.SPALT);
    w.FAELLE.forEach((f) => {
      d.getElementById('b' + f.id).value = w.SPALT[f.werkstoff][f.lot];
      d.getElementById('t' + f.id).value = f.stoss;
      d.getElementById('l' + f.id).value = String(5 * f.s);
    });
    d.getElementById('btnPruefen')
      .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    p('02: die richtige Lösung wird angenommen',
      /3 von 3 vollständig richtig/.test(d.getElementById('rueck').textContent),
      d.getElementById('rueck').textContent.slice(0, 60));
    /* Der Loetstoss muss zur Spaltbreite passen - sonst lehrt die Uebung
       das Falsche. */
    const abw = [];
    w.FAELLE.forEach((f) => {
      const g = w.SPALT[f.werkstoff][f.lot].split('…')
        .map((s) => Number(s.replace(',', '.')));
      const soll = g[1] <= 0.25 ? 'S' : g[0] >= 0.3 ? 'F' : 'S/F';
      if (soll !== f.stoss) abw.push(f.titel + ': ' + f.stoss + ' statt ' + soll);
    });
    p('02: der Lötstoß folgt aus der Spaltbreite', !abw.length, abw.join(' · '));
  }
  {
    const { w, d, laut } = await seite('uebungen/loeten-kleben/03-welches-lot.html');
    p('03 lädt ohne Fehler', !laut.length, laut[0]);
    if (TB) loteVergleich('Übung 03', w.LOTE);
    w.FAELLE.forEach((f) => {
      d.getElementById('l' + f.id).value = f.lot;
      d.getElementById('g' + f.id).value = f.grund;
    });
    d.getElementById('btnPruefen')
      .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    p('03: die richtige Lösung wird angenommen',
      /3 von 3 vollständig richtig/.test(d.getElementById('rueck').textContent),
      d.getElementById('rueck').textContent.slice(0, 60));
    /* Jedes Loesungslot muss es in der Tabelle der Seite auch geben. */
    const fehlt = w.FAELLE.filter((f) =>
      !w.LOTE.some((l) => l.kurz === f.lot)).map((f) => f.lot);
    p('03: jedes Lösungslot steht in der Tabelle', !fehlt.length, fehlt.join(', '));
  }
  {
    const { w, d, laut } = await seite(
      'uebungen/loeten-kleben/04-die-klebung-gestalten.html');
    p('04 lädt ohne Fehler', !laut.length, laut[0]);
    if (TB) kleberVergleich('Übung 04', w.KLEBER);
    w.FAELLE.forEach((f) => {
      d.getElementById('k' + f.id).value = f.kleber;
      d.getElementById('f' + f.id).value = String(f.tau * f.b * f.l / 1000);
    });
    d.getElementById('btnPruefen')
      .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    p('04: die richtige Lösung wird angenommen',
      /2 von 2 vollständig richtig/.test(d.getElementById('rueck').textContent),
      d.getElementById('rueck').textContent.slice(0, 60));
    /* Der Loesungsklebstoff muss die geforderten Bedingungen auch erfuellen -
       sonst steht in der Loesung ein Widerspruch. */
    const abw = [];
    w.FAELLE.forEach((f) => {
      const k = w.KLEBER.filter((x) => x.name === f.kleber)[0];
      if (!k) { abw.push(f.kleber + ': nicht in der Tabelle'); return; }
      if (f.tau < k.tauVon || f.tau > k.tauBis) {
        abw.push(f.titel + ': gerechnet mit ' + f.tau + ', Bereich '
          + k.tauVon + '…' + k.tauBis);
      }
    });
    p('04: gerechnet wird mit einem Wert aus dem Bereich', !abw.length,
      abw.join(' · '));
    d.getElementById('gWahl').value = 'breite';
    d.getElementById('btnGe')
      .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    p('04: „breiter“ ist die richtige Antwort',
      /Richtig\./.test(d.getElementById('geRueck').textContent));
  }

  console.log('\nDie Trainings');
  await trainingDurchspielen('trainings/loeten-kleben/01-weich-hart-oder-hoch.html',
    ['einfach', 'mittel', 'schwer'], (a) => a.spalte);
  await trainingDurchspielen('trainings/loeten-kleben/02-spaltmass-schnellcheck.html',
    ['einfach', 'mittel'], (a) => a.wahl.indexOf(a.richtig));
  await trainingDurchspielen('trainings/loeten-kleben/03-flussmittel-kennzahl.html',
    ['einfach', 'mittel', 'schwer'], (a) => a.wahl.indexOf(a.richtig));

  if (TB) {
    const { w, laut } = await seite(
      'trainings/loeten-kleben/02-spaltmass-schnellcheck.html');
    p('Training 02 lädt ohne Fehler', !laut.length, laut[0]);
    spaltVergleich('Training 02', w.LOTE, w.SPALT);
  }
  {
    const { w } = await seite('trainings/loeten-kleben/01-weich-hart-oder-hoch.html');
    if (TB) einteilungVergleich('Training 01', w.SPALTEN, w.ZEILEN);
  }
  {
    const { w } = await seite('trainings/loeten-kleben/03-flussmittel-kennzahl.html');
    if (TB) flussmittelVergleich('Training 03', w);
  }

  console.log('\n' + (fehler ? fehler + ' Befunde' : 'alles gruen'));
  process.exit(fehler ? 1 : 0);
}

main();
