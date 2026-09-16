/* Das Material zur Planung eines Drehprozesses gegen das Tabellenbuch.

   Die Trainings dieses Pakets prüfen Antworten, die die Schüler im Buch
   nachschlagen. Stimmt eine hinterlegte Zahl nicht mit dem Buch überein, übt
   das Training etwas Falsches ein - und zwar mit voller Rückmeldung, was
   schlimmer ist als gar keine.

   Geprüft wird gegen abgelesene Zeilen dieser Abschnitte (50. Auflage):
     - Schnittdaten beim Drehen, Richtwerte für HM-Werkzeuge (Seiten 350, 351)
     - Fertigungsplanung beim Drehen, Bearbeitungsbedingungen (Seite 346)
     - Vergütungsstähle, unlegiert und legiert (Seite 150)

   Zusätzlich wird jedes Training einmal durchgespielt: Die Antwort kommt aus
   dem Buch, und das Training muss sie annehmen. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { BASIS, mitAssets } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* Die abgelesenen Werte liegen in tabellenbuch/ - der Ordner steht in
   .gitignore. Fehlt er, gibt es nichts zu vergleichen; das ist kein Fehler
   im Material, sondern eine Prüfung, die hier nicht laufen kann. */
const QUELLE = path.join(BASIS, 'tabellenbuch/daten.json');
if (!fs.existsSync(QUELLE)) {
  console.log('  ohne   tabellenbuch/daten.json ist hier nicht vorhanden');
  console.log('\nnichts zu pruefen');
  process.exit(0);
}
const BUCH = JSON.parse(fs.readFileSync(QUELLE, 'utf8')).zerspanung_drehen;
if (!BUCH) {
  console.log('  ohne   daten.json kennt noch keinen Abschnitt zerspanung_drehen');
  console.log('\nnichts zu pruefen');
  process.exit(0);
}

/* Die Zeilenkennungen des Trainings auf die Zeilen des Buchs. */
const ZUORDNUNG = {
  baustahl_klein: ['baustahl', 0],
  baustahl_gross: ['baustahl', 1],
  automat_klein: ['automatenstahl', 0],
  verg_unleg_klein: ['verguetungsstahl_unlegiert', 0],
  verg_unleg_gross: ['verguetungsstahl_unlegiert', 1],
  verg_leg_klein: ['verguetungsstahl_legiert', 0],
  verg_leg_gross: ['verguetungsstahl_legiert', 1],
};
const SPALTE = {
  plan: 'querplandrehen',
  schruppen: 'laengsrund_schruppen',
  schlichten: 'laengsrund_schlichten',
  abstechen: 'abstechen_einstechen',
  gewinde: 'gewindedrehen',
};
/* Welche Zugfestigkeit in welche Zeile gehört - die Grenzen der Tabelle. */
const GRENZEN = {
  automat_klein: [0, 570],
  verg_unleg_klein: [0, 650],
  verg_unleg_gross: [650, Infinity],
  verg_leg_klein: [0, 750],
  verg_leg_gross: [750, Infinity],
};
/* Günstige Bedingungen greifen den oberen Wert, normale den Startwert,
   ungünstige den unteren. */
const GRIFF = { 'günstig': 2, 'normal': 1, 'ungünstig': 0 };

function seite(datei) {
  const voll = path.join(BASIS, 'trainings/drehprozess', datei);
  const dom = new JSDOM(mitAssets(fs.readFileSync(voll, 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/trainings/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  return dom.window;
}

console.log('\nStartwert ablesen: die Zahlen');
const w = seite('03-startwert-ablesen.html');
const d = w.document;
const ZEILEN = w.eval('ZEILEN');
const LAGEN = w.eval('LAGEN');
const WERKSTOFFE = w.eval('WERKSTOFFE');

{
  let zellen = 0;
  const schief = [];
  ZEILEN.forEach((z) => {
    const paar = ZUORDNUNG[z.id];
    if (!paar) { schief.push(z.id + ': im Buch nicht zugeordnet'); return; }
    const buch = BUCH.schnittdaten_drehen.P[paar[0]][paar[1]];
    Object.keys(SPALTE).forEach((k) => {
      zellen++;
      const a = JSON.stringify(z.werte[k]);
      const b = JSON.stringify(buch[SPALTE[k]]);
      if (a !== b) schief.push(z.id + '/' + k + ': ' + a + ' statt ' + b);
    });
  });
  p(zellen + ' Zellen stimmen mit dem Buch ueberein', schief.length === 0,
    schief.slice(0, 6).join(' | '));
  p('jede Zeile hat alle fuenf Verfahren',
    ZEILEN.every((z) => Object.keys(SPALTE).every((k) => Array.isArray(z.werte[k])
      && z.werte[k].length === 3)));
  p('in jeder Zelle liegt der Startwert zwischen den Grenzwerten',
    ZEILEN.every((z) => Object.keys(SPALTE).every((k) => {
      const v = z.werte[k];
      return v[0] <= v[1] && v[1] <= v[2];
    })));
}

console.log('\nStartwert ablesen: die Bedingungen');
{
  const falsch = LAGEN.filter((l) => GRIFF[l.urteil] !== l.griff);
  p(LAGEN.length + ' Bedingungsfelder greifen den richtigen Wert',
    falsch.length === 0, falsch.map((l) => l.urteil + '/' + l.griff).join(', '));
  p('alle drei Urteile kommen vor',
    new Set(LAGEN.map((l) => l.urteil)).size === 3);
  /* Die Zwischenfelder der Buchtabelle sind bewusst nicht dabei - sie fuehren
     auf keinen der drei Werte und waeren nicht eindeutig zu pruefen. */
  p('keine Zwischenstufe wird abgefragt',
    LAGEN.every((l) => GRIFF[l.urteil] !== undefined),
    LAGEN.map((l) => l.urteil).join(', '));
}

console.log('\nStartwert ablesen: die Werkstoffe');
{
  const ids = ZEILEN.map((z) => z.id);
  const ohne = WERKSTOFFE.filter((s) => ids.indexOf(s.zeile) < 0);
  p(WERKSTOFFE.length + ' Werkstoffe zeigen auf vorhandene Zeilen',
    ohne.length === 0, ohne.map((s) => s.name + ' -> ' + s.zeile).join(', '));
  const daneben = WERKSTOFFE.filter((s) => {
    const g = GRENZEN[s.zeile];
    return !g || s.mitte <= g[0] || s.mitte > g[1];
  });
  p('jede Zugfestigkeit passt zu ihrer Zeile', daneben.length === 0,
    daneben.map((s) => s.name + ' ' + s.mitte).join(', '));
  /* 42CrMo4 ist der Werkstoff der Welle LF5 - an ihm haengt die ganze
     Lektion, also muss er stimmen. */
  const welle = WERKSTOFFE.filter((s) => s.name === '42CrMo4')[0];
  p('42CrMo4 ist dabei', !!welle);
  p('und steht in der Zeile des Buchs',
    !!welle && welle.zeile === 'verg_leg_gross', welle && welle.zeile);
  p('mit der Zugfestigkeit aus der Stahltabelle',
    !!welle && welle.mitte === 1100, welle && String(welle.mitte));
}

console.log('\nStartwert ablesen: durchspielen');
{
  const zeileVon = (id) => ZEILEN.filter((z) => z.id === id)[0];
  const nicht = [];
  let gespielt = 0, kurz = 0;
  for (let i = 0; i < 40; i++) {
    const a = w.eval('aufgabe');
    if (a.art === 'zeile') {
      d.getElementById('aGruppe').value = 'P';
      const z = zeileVon(a.w.zeile);
      d.getElementById('aZeile').value = z.sorte + ', ' + z.rm;
    } else {
      d.getElementById('aVc').value = String(a.soll);
      if (a.art === 'bedingungen') d.getElementById('aUrteil').value = a.lage.urteil;
    }
    d.getElementById('btnPruefen').click();
    gespielt++;
    const r = d.getElementById('rueck').textContent;
    if (!/Richtig\./.test(r)) nicht.push(a.art + ': ' + r.trim().slice(0, 100));
    d.getElementById('btnWeg').click();
    if (d.getElementById('weg').textContent.trim().length < 40) kurz++;
    d.getElementById('btnWeiter').click();
  }
  p(gespielt + ' Aufgaben mit der Buchantwort geloest', nicht.length === 0,
    nicht.slice(0, 3).join(' | '));
  p('und jeder Loesungsweg ist vollstaendig', kurz === 0, kurz + ' zu kurz');

  /* Eine falsche Antwort muss auch als falsch durchgehen - sonst nickt das
     Training alles ab. */
  const a = w.eval('aufgabe');
  if (a.art === 'zeile') d.getElementById('aGruppe').value = 'K';
  else d.getElementById('aVc').value = String((a.soll || 0) + 40);
  d.getElementById('btnPruefen').click();
  p('eine falsche Antwort wird auch als falsch erkannt',
    /Noch nicht\./.test(d.getElementById('rueck').textContent),
    d.getElementById('rueck').textContent.trim().slice(0, 80));
}

console.log('\nDrehzahl rechnen: die Formeln');
{
  const x = seite('04-drehzahl-rechnen.html');
  const dx = x.document;
  /* Die Drehzahl muss abgerundet werden - das ist die Regel des Buchs, und
     sie entscheidet ueber jede zweite Antwort. */
  let schief = 0;
  for (let vc = 80; vc <= 300; vc += 10) {
    for (const d of [16, 20, 25, 30, 40, 63]) {
      const soll = Math.floor(vc * 1000 / (Math.PI * d));
      if (x.eval('drehzahl(' + vc + ',' + d + ')') !== soll) schief++;
    }
  }
  p('die Drehzahl wird immer abgerundet', schief === 0, schief + ' Abweichungen');

  const nicht = [];
  for (let i = 0; i < 30; i++) {
    const a = x.eval('aufgabe');
    if (a.art === 'schnitte') {
      dx.getElementById('aI').value = String(a.soll);
    } else {
      if (a.art === 'plan') dx.getElementById('aDm').value = String(a.dm);
      dx.getElementById('aN').value = String(a.soll);
    }
    dx.getElementById('btnPruefen').click();
    if (!/Richtig\./.test(dx.getElementById('rueck').textContent)) nicht.push(a.art);
    dx.getElementById('btnWeiter').click();
  }
  p('30 Aufgaben mit der eigenen Rechnung geloest', nicht.length === 0,
    nicht.slice(0, 4).join(', '));
}

console.log('\nVorschub und Rautiefe: gegen die Tabelle');
{
  const x = seite('05-vorschub-und-rautiefe.html');
  const dx = x.document;
  const tab = x.eval('TABELLE');
  /* Die Rechnung muss die Tabelle des Buchs treffen - sonst uebt das
     Training gegen die Quelle, mit der geprueft wird. */
  const weit = [];
  Object.keys(tab).forEach((r) => {
    Object.keys(tab[r]).forEach((rz) => {
      const gerechnet = x.eval('vorschub(' + rz + ',' + r + ')');
      if (Math.abs(gerechnet - tab[r][rz]) > 0.011) {
        weit.push('r=' + r + ' Rz=' + rz + ': ' + gerechnet.toFixed(3)
          + ' gegen ' + tab[r][rz]);
      }
    });
  });
  p('20 Tabellenwerte decken sich mit der Rechnung', weit.length === 0,
    weit.slice(0, 4).join(' | '));
  p('die Formel geht in beide Richtungen',
    Math.abs(x.eval('rautiefe(vorschub(6.3, 0.4), 0.4)') - 6.3) < 0.001);

  const nicht = [];
  for (let i = 0; i < 30; i++) {
    const a = x.eval('aufgabe');
    if (a.art === 'zurRautiefe') dx.getElementById('aRz').value = String(a.soll);
    else if (a.art === 'zumVorschub') dx.getElementById('aF').value = String(a.soll);
    else {
      dx.getElementById('aR').value = String(a.rmax);
      dx.getElementById('aF').value = String(a.soll);
    }
    dx.getElementById('btnPruefen').click();
    if (!/Richtig\./.test(dx.getElementById('rueck').textContent)) nicht.push(a.art);
    dx.getElementById('btnWeiter').click();
  }
  p('30 Aufgaben mit der eigenen Rechnung geloest', nicht.length === 0,
    nicht.slice(0, 4).join(', '));
}

console.log('\nDie Trainings mit einer Auswahl');
[['01-verfahren-erkennen.html', 'aV'],
 ['02-werkstoffgruppe-bestimmen.html', 'aG'],
 ['06-bezeichnung-zusammensetzen.html', 'aA']].forEach((paar) => {
  const datei = paar[0], feld = paar[1];
  const x = seite(datei);
  const dx = x.document;
  const nicht = [];
  let leer = 0, kurz = 0;
  for (let i = 0; i < 30; i++) {
    const a = x.eval('aufgabe');
    const e = dx.getElementById(feld);
    if (!e) { leer++; dx.getElementById('btnWeiter').click(); continue; }
    e.value = String(a.soll);
    /* Steht die richtige Antwort ueberhaupt zur Wahl? Bei einem select
       bleibt der Wert sonst leer. */
    if (e.tagName === 'SELECT' && e.value !== String(a.soll)) leer++;
    dx.getElementById('btnPruefen').click();
    if (!/Richtig\./.test(dx.getElementById('rueck').textContent)) {
      nicht.push(a.art + ': '
        + dx.getElementById('rueck').textContent.trim().slice(0, 70));
    }
    dx.getElementById('btnWeg').click();
    if (dx.getElementById('weg').textContent.trim().length < 30) kurz++;
    dx.getElementById('btnWeiter').click();
  }
  p(datei + ': 30 Aufgaben geloest', nicht.length === 0 && leer === 0,
    (leer ? leer + ' ohne waehlbare Antwort. ' : '') + nicht.slice(0, 2).join(' | '));
  p(datei + ': jede Begruendung ist da', kurz === 0, kurz + ' zu kurz');
});

console.log('\nDas Paket');
{
  const dateien = fs.readdirSync(path.join(BASIS, 'trainings/drehprozess'))
    .filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
  p('sechs Trainings liegen im Paket', dateien.length === 6, dateien.join(', '));
  const info = JSON.parse(fs.readFileSync(
    path.join(BASIS, 'trainings/drehprozess/info.json'), 'utf8'));
  const fehlend = info.reihenfolge.filter((f) => dateien.indexOf(f) < 0);
  p('die Reihenfolge nennt nur Dateien, die es gibt', fehlend.length === 0,
    fehlend.join(', '));
  const ungenannt = dateien.filter((f) => info.reihenfolge.indexOf(f) < 0);
  p('und laesst keine aus', ungenannt.length === 0, ungenannt.join(', '));
  /* Jedes Training macht beim Wettkampf mit - das Nachschlagen auf Zeit ist
     der Grund, warum es dieses Paket gibt. */
  const ohne = dateien.filter((f) => !fs.readFileSync(
    path.join(BASIS, 'trainings/drehprozess', f), 'utf8').includes('TBK_WETTKAMPF'));
  p('alle sechs machen beim Wettkampf mit', ohne.length === 0, ohne.join(', '));
}

console.log('\nDie Verdrahtung');
{
  const text = fs.readFileSync(
    path.join(BASIS, 'trainings/drehprozess/03-startwert-ablesen.html'), 'utf8');
  p('das Training sagt, dass das Buch danebengehoert',
    /Tabellenbuch gehört aufgeschlagen/.test(text));
  p('und nennt seine Quellen in der Fussnote',
    /Woher die Zahlen stammen/.test(text));
  const info = path.join(BASIS, 'trainings/drehprozess/info.json');
  p('das Paket hat eine info.json', fs.existsSync(info));
  if (fs.existsSync(info)) {
    const i = JSON.parse(fs.readFileSync(info, 'utf8'));
    p('mit Titel nach der Konvention',
      /^[^:]+: [^-]+ - .+$/.test(i.titel), i.titel);
    p('und die Datei steht in der Reihenfolge',
      (i.reihenfolge || []).indexOf('03-startwert-ablesen.html') >= 0);
  }
}

console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
process.exit(fehler ? 1 : 0);
