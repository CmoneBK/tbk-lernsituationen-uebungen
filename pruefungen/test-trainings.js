/* Die Trainings: laufen sie, zählen sie richtig, und heißen die Bausteine
   dort "Training" statt "Übung"? */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

const dir = path.join(BASIS, 'trainings/schraubverbindungen');

function seite(datei) {
  const fehler = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => fehler.push('Laufzeit: ' + (e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(dir, datei), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/trainings/schraubverbindungen/' + datei,
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  return { dom, w: dom.window, d: dom.window.document, fehler };
}

/* Die vier Rechen-Trainings: Traegt man die richtige Antwort ein, muss die
   Seite das auch sagen. Die Loesung steht im Zustand der Seite (w.aufgabe) -
   so prueft das hier den Weg von der Eingabe bis zur Rueckmeldung und nicht
   noch einmal die Rechnung. */
const ANTWORTEN = {
  '04-reicht-die-laenge.html': (w, d) => {
    d.getElementById('aNoetig').value = String(w.aufgabe.loesung.noetig);
    d.getElementById('aWahl').value = String(w.aufgabe.loesung.wahl);
  },
  '05-klasse-und-zahl.html': (w, d) => {
    const a = w.aufgabe;
    if (a.art === 'ausKlasse') {
      d.getElementById('aRm').value = String(a.k.Rm);
      d.getElementById('aRe').value = String(a.k.Re);
    } else if (a.art === 'zurKlasse') {
      d.getElementById('aKlasse').value = a.klasse;
    } else {
      d.getElementById('aF').value = String(a.F);
    }
  },
  '06-haelt-oder-rutscht.html': (w, d) => {
    d.getElementById('aFR').value = String(w.aufgabe.FR);
    d.getElementById('aUrteil').value = w.aufgabe.haelt ? 'haelt' : 'rutscht';
  },
  '07-im-tabellenbuch-nachschlagen.html': (w, d) => {
    d.getElementById('aWert').value = String(w.aufgabe.soll);
  },
};

async function main() {
  let fehlerGesamt = 0;

  for (const datei of fs.readdirSync(dir).filter(f => /^\d/.test(f)).sort()) {
    const { dom, d, fehler } = seite(datei);
    await fertig(dom);
    // Das Ergebnis gehoert zum Durchgang und darf nicht schon dastehen.
    if (d.getElementById('ende')) {
      if (!d.getElementById('ende').hidden) fehler.push('Ergebnis vorzeitig sichtbar');
    }
    const p = (was, ok) => { if (!ok) fehler.push(was); };

    /* Die richtige Antwort muss auch als richtig durchgehen - und zwar in
       zehn Runden hintereinander, damit jede Rundenart drankommt. */
    const antwort = ANTWORTEN[datei];
    if (antwort) {
      for (let runde = 0; runde < 10; runde++) {
        antwort(d.defaultView, d);
        d.getElementById('btnPruefen').click();
        const r = d.getElementById('rueck');
        if (r.hidden || !/\bja\b/.test(r.className)) {
          fehler.push('richtige Antwort nicht anerkannt (Runde ' + (runde + 1)
            + ': ' + r.className + ' – ' + r.textContent.trim().slice(0, 70) + ')');
          break;
        }
        d.getElementById('btnWeiter').click();
      }
    }

    // Die Bausteine müssen hier "Training" sagen.
    const knopf = d.getElementById('bk-knopf');
    p('kein Baukasten', !!knopf);
    if (knopf) {
      p('Knopf sagt nicht "Training" (' + knopf.textContent.trim() + ')',
        knopf.textContent.includes('Training anpassen'));
      knopf.click();
      p('Fenster sagt nicht "Training"',
        d.getElementById('bk-tafel').textContent.includes('Training anpassen'));
      knopf.click();
    }
    p('kein Download-Knopf', !!d.getElementById('ex-knopf'));
    if (d.getElementById('ex-knopf')) {
      d.getElementById('ex-knopf').click();
      p('Download-Hinweis nennt nicht "Training anpassen"',
        d.getElementById('ex-tafel').textContent.includes('Training anpassen'));
      d.getElementById('ex-knopf').click();
    }

    if (datei.startsWith('01')) {
      p('Tafel leer', d.getElementById('tafel').children.length >= 14);
      p('keine Frage', d.getElementById('gefragt').textContent !== '–');
      const knoepfe = [...d.querySelectorAll('#auswahl button')];
      p('keine vier Antworten (' + knoepfe.length + ')', knoepfe.length === 4);
      // Bis zum Ergebnis durchklicken: immer die erste Antwort.
      for (let i = 0; i < 40 && d.getElementById('ende').hidden; i++) {
        const k = d.querySelector('#auswahl button:not([disabled])');
        if (k) k.click();
        const w = d.getElementById('btnWeiter');
        if (w && !w.hidden) w.click();
      }
      p('kein Ergebnis erreicht', !d.getElementById('ende').hidden);
      p('Bilanz ohne Zahl', /\d+ von \d+ richtig/.test(d.getElementById('bilanz').textContent));
    }

    if (datei.startsWith('02')) {
      p('keine Aufgabe', d.getElementById('aufgabe').textContent.includes('Festigkeitsklasse'));
      // Rechenweg zeigen und eine falsche Antwort prüfen
      d.getElementById('btnWeg').click();
      p('kein Rechenweg', d.getElementById('weg').textContent.includes('Spannungsquerschnitt'));
      d.getElementById('aFM').value = '1';
      d.getElementById('aMA').value = '1';
      d.getElementById('btnPruefen').click();
      p('falsche Antwort nicht erkannt', d.getElementById('rueck').className.includes('nein'));
      // Richtige Antwort aus dem Rechenweg ablesen und eintragen
      const zahlen = d.getElementById('weg').textContent.match(/([\d,]+) kN/);
      const ma = d.getElementById('weg').textContent.match(/([\d,]+) N·m/);
      p('Rechenweg ohne kN-Wert', !!zahlen);
      p('Rechenweg ohne N·m-Wert', !!ma);
      if (zahlen && ma) {
        d.getElementById('aFM').value = zahlen[1].replace(',', '.');
        d.getElementById('aMA').value = ma[1].replace(',', '.');
        d.getElementById('btnPruefen').click();
        p('richtige Antwort nicht erkannt (' + zahlen[1] + ' / ' + ma[1] + ')',
          d.getElementById('rueck').className.includes('ja'));
      }
      const vorher = d.getElementById('aufgabe').textContent;
      d.getElementById('btnWeiter').click();
      p('Aufgabenzähler springt nicht', d.getElementById('stand').textContent.includes('2'));
      p('Eingaben nicht geleert', d.getElementById('aFM').value === '');
    }

    if (datei.startsWith('03')) {
      p('keine Aussage', d.getElementById('aussage').textContent.length > 20);

      // Jede Aussage braucht ihr Bild - und es muss sich auch zeichnen lassen.
      const w = dom.window;
      const ohneBild = [], leer = [], schief = [];
      w.AUSSAGEN.forEach(a => {
        if (!a.bild) { ohneBild.push(a.satz); return; }
        w.bildZeichnen(a);
        const svg = d.querySelector('#bildAussage svg');
        if (!svg || svg.querySelectorAll('line,rect,circle,polygon').length < 8) {
          leer.push(a.satz);
          return;
        }
        // Die Unterschrift nennt das gemeinte Feld, nicht das richtige.
        const unter = d.querySelector('#bildAussage figcaption').textContent;
        if (!unter.includes(a.bild.meint) || /richtig|falsch|normgerecht ist/.test(unter)) {
          schief.push(a.satz);
        }
      });
      p('Aussagen ohne Bild: ' + ohneBild.length, !ohneBild.length, ohneBild[0]);
      p('Bilder ohne Inhalt: ' + leer.length, !leer.length, leer[0]);
      p('Unterschrift verraet zu viel oder zu wenig', !schief.length, schief[0]);
      // Nach dem Ausflug wieder die laufende Aufgabe zeichnen.
      d.getElementById('btnNeu').click();
      p('Uhr fehlt', /^\d+:\d\d$/.test(d.getElementById('zeit').textContent));
      for (let i = 0; i < 40 && d.getElementById('ende').hidden; i++) {
        const j = d.getElementById('btnJa');
        if (!j.disabled) j.click();
        const w = d.getElementById('btnWeiter');
        if (w && !w.hidden) w.click();
      }
      p('kein Ergebnis erreicht', !d.getElementById('ende').hidden);
      p('Bilanz ohne Zeit', /in \d+:\d\d/.test(d.getElementById('bilanz').textContent));
      p('Rückblick fehlt', d.getElementById('rueckblick').textContent.length > 20);
    }

    // Laufende Uhren wuerden den Prozess offen halten.
    dom.window.close();

    console.log((fehler.length ? 'FEHLER ' : 'ok     ') + datei +
      (fehler.length ? '\n         ' + fehler.join('\n         ') : ''));
    fehlerGesamt += fehler.length;
  }

  console.log(fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.' : '\nAlle Trainings laufen.');
  process.exitCode = fehlerGesamt ? 1 : 0;
}

main();
