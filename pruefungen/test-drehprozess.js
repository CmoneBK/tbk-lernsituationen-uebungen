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

/* Die Lektion liegt im Werkzeug-Repo und bindet ihre Bausteine von dort
   ein - mit eigenem Pfad, deshalb ein eigenes Einsetzen. */
function mitTools(html, ordner) {
  const schluss = '<' + '/script>';
  return html.replace(
    new RegExp('<script src="(assets/[a-z-]+\.js)"[^>]*>[^]*?' + schluss, 'g'),
    (_, d) => '<script>'
      + fs.readFileSync(path.join(ordner, d), 'utf8')
        .split(schluss).join('<\\' + '/script>')
      + schluss);
}

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
const ALLES = JSON.parse(fs.readFileSync(QUELLE, 'utf8'));
const BUCH = ALLES.zerspanung_drehen;
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
  /* 42CrMo4 ist der Werkstoff der Antriebswelle - an ihm haengt die ganze
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

console.log('\nHauptnutzungszeit: durchspielen');
{
  const x = seite('07-hauptnutzungszeit.html');
  const dx = x.document;

  /* Der Vorschubweg ist die Stelle, an der es schiefgeht: Wer L = l setzt,
     laesst An- und Ueberlauf weg. Also wird jeder Fall einmal gegen die
     Formel des Buches gerechnet. */
  const LA = x.eval('LA');
  p('An- und Ueberlauf sind angesetzt', LA >= 1 && LA <= 2, String(LA));
  const faelle = x.eval('FAELLE').map((f) => f.id);
  p('alle fuenf Faelle des Vorschubweges sind da', faelle.length === 5,
    faelle.join(', '));
  const probe = {l: 50, d: 40, d1: 20};
  const erwartet = {laengs_ohne: 50 + 2 * LA, laengs_mit: 50 + LA,
    plan_voll: 20 + LA, plan_ansatz: 10 + LA, stechen: 50 + LA};
  const schief = faelle.filter((id) => Math.abs(
    x.eval('fall("' + id + '").weg(' + JSON.stringify(probe) + ')')
    - erwartet[id]) > 1e-9);
  p('jeder Fall rechnet den Weg des Buches', schief.length === 0,
    schief.join(', '));

  const arten = {}, nicht = [];
  for (let i = 0; i < 45; i++) {
    const a = x.eval('aufgabe');
    arten[a.art] = (arten[a.art] || 0) + 1;
    if (a.art === 'weg') dx.getElementById('aL').value = String(a.soll);
    else if (a.art === 'zeit') dx.getElementById('aT').value = a.soll.toFixed(3);
    else {
      dx.getElementById('aN').value = String(a.n);
      dx.getElementById('aT').value = a.soll.toFixed(3);
    }
    dx.getElementById('btnPruefen').click();
    if (!/Richtig\./.test(dx.getElementById('rueck').textContent)) {
      nicht.push(a.art + ': '
        + dx.getElementById('rueck').textContent.trim().slice(0, 70));
    }
    dx.getElementById('btnWeg').click();
    dx.getElementById('btnWeiter').click();
  }
  p('45 Aufgaben mit der eigenen Rechnung geloest', nicht.length === 0,
    nicht.slice(0, 2).join(' | '));
  p('alle drei Rundenarten kamen vor', Object.keys(arten).length === 3,
    JSON.stringify(arten));
}

console.log('\nToleranzmitte: durchspielen');
{
  const x = seite('08-toleranzmitte.html');
  const dx = x.document;

  /* Die Grenzabmasse muessen dieselben sein wie im Tabellenbuch - sonst
     uebt das Training gegen die Quelle, mit der geprueft wird. */
  if (ALLES.passungen && ALLES.passungen.einheitsbohrung_h7_um) {
    const buch = ALLES.passungen.einheitsbohrung_h7_um.werte;
    const zeilen = {10: '6…10', 18: '10…18', 30: '18…30', 50: '30…50'};
    const falsch = [];
    x.eval('ABMASSE').forEach((zeile) => {
      const soll = buch[zeilen[zeile.bis]];
      if (!soll) return;
      Object.keys(zeile.w).forEach((k) => {
        if (!soll[k]) return;
        if (zeile.w[k][0] !== soll[k][0] || zeile.w[k][1] !== soll[k][1]) {
          falsch.push('bis ' + zeile.bis + ' ' + k);
        }
      });
    });
    p('die Grenzabmasse stimmen mit dem Buch', falsch.length === 0,
      falsch.slice(0, 5).join(', '));
  }

  /* Bei k6 liegt die ganze Toleranzzone ueber dem Nennmass - das ist der
     Fall, in dem das Nennmass als Zielmass schon Ausschuss waere. */
  const k6 = x.eval('passung(25, "k6")');
  p('k6 liegt ganz ueber dem Nennmass',
    k6.mindest > 25 && k6.mitte > 25, String(k6.mindest));

  const arten = {}, nicht = [];
  for (let i = 0; i < 45; i++) {
    const a = x.eval('aufgabe');
    arten[a.art] = (arten[a.art] || 0) + 1;
    if (a.art === 'grenzen') {
      dx.getElementById('aH').value = a.p.hoechst.toFixed(3);
      dx.getElementById('aM').value = a.p.mindest.toFixed(3);
    } else if (a.art === 'mitte') {
      dx.getElementById('aZ').value = a.p.mitte.toFixed(4);
      dx.getElementById('aT').value = String(Math.round(a.p.weite * 1000));
    } else {
      dx.getElementById('aU').value = a.urteil;
    }
    dx.getElementById('btnPruefen').click();
    if (!/Richtig\./.test(dx.getElementById('rueck').textContent)) {
      nicht.push(a.art + ': '
        + dx.getElementById('rueck').textContent.trim().slice(0, 70));
    }
    dx.getElementById('btnWeg').click();
    dx.getElementById('btnWeiter').click();
  }
  p('45 Aufgaben mit der eigenen Rechnung geloest', nicht.length === 0,
    nicht.slice(0, 2).join(' | '));
  p('alle drei Rundenarten kamen vor', Object.keys(arten).length === 3,
    JSON.stringify(arten));
}

console.log('\nMessmittel waehlen: durchspielen');
{
  const x = seite('09-messmittel-waehlen.html');
  const dx = x.document;

  /* Die Allgemeintoleranz gibt ein Grenzabmass, keine Weite - das ist der
     Fehler, um den es in der zweiten Rundenart geht. */
  if (ALLES.allgemeintoleranzen) {
    const buch = ALLES.allgemeintoleranzen.laengenmasse_mm;
    const spalten = ['0,5…3', '3…6', '6…30', '30…120', '120…400'];
    const falsch = [];
    x.eval('ALLGEMEIN').bereiche.forEach((b, i) => {
      ['f', 'm', 'c', 'v'].forEach((k) => {
        const name = {f: 'f (fein)', m: 'm (mittel)', c: 'c (grob)',
          v: 'v (sehr grob)'}[k];
        if (buch[name][i] !== b[k]) falsch.push(spalten[i] + ' ' + k);
      });
    });
    p('die Allgemeintoleranzen stimmen mit dem Buch', falsch.length === 0,
      falsch.slice(0, 5).join(', '));
  }

  const arten = {}, nicht = [];
  for (let i = 0; i < 45; i++) {
    const a = x.eval('aufgabe');
    arten[a.art] = (arten[a.art] || 0) + 1;
    if (a.art === 'iso') dx.getElementById('aT').value = String(a.soll);
    else if (a.art === 'allgemein') {
      dx.getElementById('aA').value = String(a.ab);
      dx.getElementById('aW').value = String(a.soll);
    } else {
      dx.getElementById('aJ').value = a.soll;
      dx.getElementById('aS').value = a.schritte.toFixed(1);
    }
    dx.getElementById('btnPruefen').click();
    if (!/Richtig\./.test(dx.getElementById('rueck').textContent)) {
      nicht.push(a.art + ': '
        + dx.getElementById('rueck').textContent.trim().slice(0, 70));
    }
    dx.getElementById('btnWeg').click();
    dx.getElementById('btnWeiter').click();
  }
  p('45 Aufgaben mit der eigenen Rechnung geloest', nicht.length === 0,
    nicht.slice(0, 2).join(' | '));
  p('alle drei Rundenarten kamen vor', Object.keys(arten).length === 3,
    JSON.stringify(arten));
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
  p('neun Trainings liegen im Paket', dateien.length === 9, dateien.join(', '));
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
  p('alle neun machen beim Wettkampf mit', ohne.length === 0, ohne.join(', '));
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

console.log('\nDie Uebungen');
{
  const ORDNER = path.join(BASIS, 'uebungen/drehprozess');
  const dateien = fs.readdirSync(ORDNER)
    .filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
  p('sieben Uebungen liegen im Paket', dateien.length === 7,
    dateien.join(', '));

  /* Jede Uebung wird geladen und ihre Pruefknoepfe werden gedrueckt - ohne
     Eingabe. Erwartet wird "Noch nichts eingetragen": Wer nichts weiss, soll
     nicht faelschlich gelobt werden. */
  dateien.forEach((datei) => {
    const voll = path.join(ORDNER, datei);
    const dom = new JSDOM(mitAssets(fs.readFileSync(voll, 'utf8')), {
      runScripts: 'dangerously',
      url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
      beforeParse(w) {
        w.Element.prototype.scrollIntoView = function () {};
        w.__laut = [];
        w.addEventListener('error', (e) => w.__laut.push(String(e.message)));
      },
    });
    const w = dom.window, d = w.document;
    p(datei + ': laedt ohne Fehler', w.__laut.length === 0, w.__laut[0]);

    const knoepfe = [...d.querySelectorAll('button.knopf')]
      .filter((b) => /Pr\u00fcfen/.test(b.textContent));
    p(datei + ': hat Pruefknoepfe', knoepfe.length > 0, String(knoepfe.length));
    knoepfe.forEach((b) => b.click());
    const bilanzen = [...d.querySelectorAll('.bilanzzeile')];
    /* Keine Bilanz darf eine Trefferzahl nennen, bevor etwas eingetragen ist.
       Wie sie das sagt, bleibt ihr ueberlassen - die Ziehliste in Uebung 01
       hat nichts einzutragen und meldet deshalb "noch nichts geprueft". */
    p(datei + ': ohne Eingabe wird nichts als richtig gewertet',
      bilanzen.length > 0
      && !bilanzen.some((z) => /" + B + "d+ von " + B + "d+/.test(z.textContent)),
      bilanzen.map((z) => z.textContent).join(' | ').slice(0, 110));

    /* Und jede Loesung steht vollstaendig da - eine leere Loesung ist
       schlimmer als keine. */
    const loesungen = [...d.querySelectorAll('details')];
    const leer = loesungen.filter((x) => x.textContent.trim().length < 60);
    p(datei + ': jede Loesung ist ausgefuehrt', leer.length === 0,
      leer.length + ' zu kurz');
    w.close();
  });
}

console.log('\nDie Reihenfolge zum Ziehen');
{
  const datei = '01-welches-verfahren-gehoert-hierher.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;
  const karten = () => [...d.querySelectorAll('#ablaufListe li')];

  p('acht Karten liegen bereit', karten().length === 8, String(karten().length));
  p('jede laesst sich ziehen',
    karten().every((k) => k.getAttribute('draggable') === 'true'));
  /* Eine Uebung, die sich nur ziehen laesst, waere fuer einen Teil der
     Klasse keine. */
  p('jede ist mit der Tastatur erreichbar',
    karten().every((k) => k.getAttribute('tabindex') === '0'));
  p('jede sagt, wo sie steht',
    karten().every((k) => /Platz \d+ von 8/.test(k.getAttribute('aria-label') || '')),
    karten()[0].getAttribute('aria-label'));
  p('und hat zwei Knoepfe zum Schieben',
    karten().every((k) => k.querySelectorAll('button[data-weg]').length === 2));
  p('die Startreihenfolge ist durcheinander',
    w.eval('reihenfolge').some((nr, i) => nr !== i + 1),
    w.eval('reihenfolge').join(' '));

  /* Mit den Knoepfen sortieren - denselben Weg geht die Tastatur. */
  for (let runde = 0; runde < 40; runde++) {
    const r = w.eval('reihenfolge');
    let getan = false;
    for (let i = 0; i < r.length; i++) {
      if (r[i] !== i + 1) {
        w.eval('schieben(' + r.indexOf(i + 1) + ', ' + i + ')');
        getan = true;
        break;
      }
    }
    if (!getan) break;
  }
  p('sie laesst sich sortieren',
    w.eval('reihenfolge').join(',') === '1,2,3,4,5,6,7,8',
    w.eval('reihenfolge').join(' '));

  d.getElementById('btnAblauf').click();
  p('und wird dann als richtig erkannt',
    /Alle acht an der richtigen Stelle/.test(
      d.getElementById('bilanzAblauf').textContent),
    d.getElementById('bilanzAblauf').textContent);
  p('jede Karte ist gruen markiert',
    karten().every((k) => k.classList.contains('ja')));

  /* Neu mischen darf keine Karte an ihrem Platz stehen lassen - sonst
     verschenkt die Uebung einen Teil ihrer Aufgabe. */
  let gut = true;
  for (let i = 0; i < 20; i++) {
    d.getElementById('btnAblaufNeu').click();
    if (w.eval('reihenfolge').some((nr, k) => nr === k + 1)) gut = false;
  }
  p('nach dem Mischen steht keine Karte zufaellig richtig', gut);

  d.getElementById('btnAblauf').click();
  p('und das Urteil faellt entsprechend aus',
    /an der richtigen Stelle/.test(d.getElementById('bilanzAblauf').textContent)
    && !/Alle acht/.test(d.getElementById('bilanzAblauf').textContent),
    d.getElementById('bilanzAblauf').textContent);

  /* Ein Zug mit der Maus geht denselben Weg wie einer mit der Tastatur. */
  const vorher = w.eval('reihenfolge').join(',');
  d.querySelector('#ablaufListe button[data-weg="1"]').click();
  p('der Knopf schiebt die Karte', w.eval('reihenfolge').join(',') !== vorher,
    vorher + ' -> ' + w.eval('reihenfolge').join(','));
  w.close();
}

console.log('\nDie Uebung zur Schnittgeschwindigkeit rechnet wie das Buch');
{
  const datei = '02-vom-werkstoff-zur-schnittgeschwindigkeit.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;
  const start = w.eval('STARTWERTE');
  /* Die Spannwelle ist aus C25E: Rm 575 N/mm2, also die Zeile
     'Verguetungsstahl, unlegiert, Rm <= 650'. */
  const zeile = BUCH.schnittdaten_drehen.P.verguetungsstahl_unlegiert
    .find((z) => z.rm === '<=650');
  const paare = {plan: 'querplandrehen', schr: 'laengsrund_schruppen',
    schl: 'laengsrund_schlichten', abst: 'abstechen_einstechen',
    gew: 'gewindedrehen'};
  const schief = start.filter((v) => JSON.stringify(v.werte)
    !== JSON.stringify(zeile[paare[v.id]]));
  p('die fuenf Zellen stimmen mit dem Buch', schief.length === 0,
    schief.map((v) => v.id).join(', '));

  /* Den ganzen Weg einmal richtig ausfuellen. */
  d.getElementById('wNr').value = '1.1158';
  d.getElementById('wZu').value = '+QT';
  d.getElementById('wRmU').value = '500';
  d.getElementById('wRmO').value = '650';
  d.getElementById('wRmM').value = '575';
  d.getElementById('btn1').click();
  p('Teil 1 wird als vollstaendig richtig erkannt',
    /5 von 5 richtig/.test(d.getElementById('bilanz1').textContent),
    d.getElementById('bilanz1').textContent);

  d.getElementById('wG').value = 'P';
  d.getElementById('wZ').value = 'b';
  d.getElementById('btn2').click();
  p('Teil 2 ebenso',
    /2 von 2 richtig/.test(d.getElementById('bilanz2').textContent),
    d.getElementById('bilanz2').textContent);

  start.forEach((v) => { d.getElementById('s_' + v.id).value = String(v.werte[1]); });
  d.getElementById('btn3').click();
  p('Teil 3 ebenso',
    /5 von 5 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);

  const faelle = w.eval('FAELLE');
  const schrupp = w.eval('SCHRUPPEN');
  faelle.forEach((f) => {
    const vc = schrupp[f.griff];
    d.getElementById('b_' + f.id).value = f.urteil;
    d.getElementById('v_' + f.id).value = String(vc);
    d.getElementById('n_' + f.id).value =
      String(w.eval('drehzahl(' + vc + ', D_BUND)'));
  });
  d.getElementById('btn4').click();
  p('Teil 4 ebenso',
    /6 von 6 richtig/.test(d.getElementById('bilanz4').textContent),
    d.getElementById('bilanz4').textContent);
  w.close();
}

console.log('\nDie Lernsituation');
{
  const voll = path.join(BASIS, 'lernsituationen/antriebswelle/index.html');
  const dom = new JSDOM(mitAssets(fs.readFileSync(voll, 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/lernsituationen/antriebswelle/',
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;

  const zeilen = d.querySelectorAll('#arbeitsplan tr').length;
  p('der Arbeitsplan hat elf Vorgaenge', zeilen === 11, String(zeilen));
  p('und drei Felder je Zeile zum Ausfuellen',
    d.querySelectorAll('#arbeitsplan textarea').length === zeilen * 3,
    String(d.querySelectorAll('#arbeitsplan textarea').length));
  p('die Werkzeugliste steht bereit',
    d.querySelectorAll('#werkzeugliste tr').length >= 6);
  p('die Musterloesung des Arbeitsplans ist vollstaendig',
    d.querySelectorAll('#planLoesung tr').length === zeilen);

  /* Pruefschritte sind eigene Vorgangszeilen, nicht Randnotizen - und
     ohne Pruefmittel in der Werkzeugspalte waeren sie keine. */
  const planZeilen = w.eval('PLAN');
  const pruefzeilen = planZeilen.filter((z) => /^Pr\u00fcfen:/.test(z.vorgang));
  p('mindestens drei Vorgaenge sind Pruefschritte', pruefzeilen.length >= 3,
    pruefzeilen.map((z) => z.nr).join(', '));
  const ohneMittel = pruefzeilen.filter(
    (z) => !/Messschieber|B\u00fcgelmessschraube|Lehrring/.test(z.wz));
  p('jeder nennt sein Pruefmittel', ohneMittel.length === 0,
    ohneMittel.map((z) => z.nr).join(', '));
  p('und die Passungszeile nennt die Toleranzmitte',
    planZeilen.some((z) => /Mitte der Toleranz/.test(z.hinweis)));

  /* Keine Drehzahl darf als Platzhalter stehen bleiben. */
  const plan = d.getElementById('planLoesung').textContent;
  p('keine Drehzahl blieb bei null stehen', !/n = 0 1\/min/.test(plan));

  /* Die Drehzahlen der Musterloesung muessen Stufen der Maschine sein. */
  const stufen = w.eval('STUFEN');
  /* Die Gruppe herausziehen, nicht alle Ziffern der Fundstelle - sonst
     haengt die 1 aus "1/min" hinten an der Drehzahl. */
  const genannt = [...plan.matchAll(/n = (\d+) 1\/min/g)]
    .map((m) => Number(m[1]));
  const fremd = genannt.filter((n) => stufen.indexOf(n) < 0);
  p(genannt.length + ' Drehzahlen sind Stufen der Maschine', fremd.length === 0,
    fremd.join(', '));

  /* Und der ganze Weg einmal richtig ausgefuellt. */
  d.getElementById('wRm').value = '1100';
  d.getElementById('wG').value = 'P';
  d.getElementById('wB').value = 'normal';
  d.getElementById('btn3').click();
  p('Werkstoff und Bedingungen werden erkannt',
    /3 von 3 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);

  const vorgaenge = w.eval('VORGAENGE');
  vorgaenge.forEach((v) => {
    d.getElementById('vc_' + v.id).value = String(v.vc);
    d.getElementById('n_' + v.id).value =
      String(w.eval('stufe(drehzahl(' + v.vc + ', ' + v.d + '))'));
  });
  d.getElementById('btn4').click();
  p('alle Schnittdaten werden erkannt',
    /12 von 12 richtig/.test(d.getElementById('bilanz4').textContent),
    d.getElementById('bilanz4').textContent);

  d.getElementById('vRw').value = String(w.eval('R_ENG'));
  d.getElementById('vR').value = String(w.eval('R_ECKE'));
  d.getElementById('vF4').value = String(w.eval('vorschub(4, R_ECKE)'));
  d.getElementById('vF10').value = String(w.eval('vorschub(10, R_SCHRUPP)'));
  d.getElementById('btn5').click();
  p('die Vorschuebe werden erkannt',
    /4 von 4 richtig/.test(d.getElementById('bilanz5').textContent),
    d.getElementById('bilanz5').textContent);
  p('die engste Innenrundung ist der Freistich, nicht die R1',
    w.eval('R_ENG') === 0.6 && w.eval('R_ECKE') === 0.4,
    'R_ENG=' + w.eval('R_ENG') + ' R_ECKE=' + w.eval('R_ECKE'));

  /* Teil 6: die Passungen. Gerechnet wird gegen die Grenzabmasse, die bei
     der Welle stehen - eine Quelle fuer Zeichnung und Rechnung. */
  const passungen = w.eval('PASSUNGEN');
  p('die Welle traegt zwei Passungen', passungen.length === 2,
    passungen.map((x) => x.nennmass + ' ' + x.klasse).join(', '));
  passungen.forEach((x) => {
    d.getElementById('p_' + x.id + '_h').value = x.hoechst.toFixed(3);
    d.getElementById('p_' + x.id + '_m').value = x.mindest.toFixed(3);
    d.getElementById('p_' + x.id + '_z').value = x.mitte.toFixed(4);
  });
  d.getElementById('btn6').click();
  p('die Grenzmasse und das Mittenmass werden erkannt',
    /6 von 6 richtig/.test(d.getElementById('bilanz6').textContent),
    d.getElementById('bilanz6').textContent);

  /* Das Mittenmass muss wirklich in der Mitte liegen - und bei k6 ueber
     dem Nennmass, sonst ginge der haeufigste Fehler durch. */
  const k6 = passungen.filter((x) => x.klasse === 'k6')[0];
  p('das Mittenmass des k6 liegt ueber dem Nennmass',
    k6 && k6.mitte > k6.nennmass, k6 ? String(k6.mitte) : 'kein k6');
  const f7 = passungen.filter((x) => x.klasse === 'f7')[0];
  p('und das des f7 darunter',
    f7 && f7.mitte < f7.nennmass, f7 ? String(f7.mitte) : 'kein f7');

  /* Teil 10: die Hauptnutzungszeit. Die Drehzahlen sind dieselben Stufen
     wie in Teil 4 - sonst rechnete die Lernsituation zweimal anders. */
  const zeiten = w.eval('ZEITEN');
  let summe = 0;
  zeiten.forEach((z) => {
    const t = w.eval('zeitSekunden(ZEITEN.filter(function(x){'
      + ' return x.id === "' + z.id + '"; })[0])');
    summe += t;
    d.getElementById(z.id + '_L').value = z.L.toFixed(1);
    d.getElementById(z.id + '_t').value = t.toFixed(1);
  });
  d.getElementById('zSumme').value = summe.toFixed(1);
  d.getElementById('btn10').click();
  p('Vorschubwege und Zeiten werden erkannt',
    /7 von 7 richtig/.test(d.getElementById('bilanz10').textContent),
    d.getElementById('bilanz10').textContent);
  p('die Drehzahlen der Zeitrechnung sind Maschinenstufen',
    zeiten.every((z) => w.eval('STUFEN').indexOf(
      w.eval('zeitDrehzahl(ZEITEN.filter(function(x){ return x.id === "'
        + z.id + '"; })[0])')) >= 0));
  p('der Schlichtgang dauert am laengsten',
    summe > 30 && summe < 40, 'Summe ' + summe.toFixed(1) + ' s');
  w.close();
}

console.log('\nDie Uebung zur Wendeschneidplatte');
{
  const datei = '03-eine-wendeschneidplatte-lesen.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;
  const setz = (id, wert) => { d.getElementById(id).value = String(wert); };

  /* Teil 1: die Platte aus der Schachtel zerlegen. */
  setz('z1', 55); setz('z2', 7); setz('z7', 0.8);
  setz('z9', 'R'); setz('z10', 'P');
  d.getElementById('btn1').click();
  p('die Bezeichnung wird richtig zerlegt',
    /5 von 5 richtig/.test(d.getElementById('bilanz1').textContent),
    d.getElementById('bilanz1').textContent);

  /* Teil 2: die Kette von der engsten Rundung zum Vorschub. */
  const eng = w.eval('R_ENG'), ecke = w.eval('R_ECKE');
  setz('pRw', eng);
  setz('pMax', Math.round((eng - 0.1) * 100) / 100);
  setz('pPasst', 'ja');
  setz('pF', w.eval('vorschub(4, R_ECKE)').toFixed(2));
  setz('pGruppe', 'ja');
  d.getElementById('btn2').click();
  p('die Kette zum Vorschub geht auf',
    /5 von 5 richtig/.test(d.getElementById('bilanz2').textContent),
    d.getElementById('bilanz2').textContent);
  p('sie rechnet mit der Welle, die sie zeigt',
    eng === w.WELLE.kleinsterInnenradius && ecke < eng,
    'R_ENG=' + eng + ' R_ECKE=' + ecke + ' Welle=' + w.WELLE.id);

  /* Teil 3: die Bezeichnung selbst bilden. */
  setz('b1', 'C'); setz('b2', 'N'); setz('b9', 'R');
  setz('b7', '12');
  d.getElementById('btn3').click();
  p('die Schruppplatte wird richtig zusammengesetzt',
    /4 von 4 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);
  w.close();
}

console.log('\nDie Uebung zum Vorschub');
{
  const datei = '04-wie-fein-muss-der-vorschub-sein.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;
  const setz = (id, wert) => { d.getElementById(id).value = String(wert); };

  /* Teil 1: je Forderung ein Vorschub. */
  const forderungen = w.eval('FORDERUNGEN');
  forderungen.forEach((f, i) => {
    setz('f' + i, w.eval('vorschub(' + f.rz + ', R_ECKE)').toFixed(2));
  });
  d.getElementById('btn1').click();
  p('zu jeder Rautiefe der richtige Vorschub',
    new RegExp(forderungen.length + ' von ' + forderungen.length
      + ' richtig').test(d.getElementById('bilanz1').textContent),
    d.getElementById('bilanz1').textContent);

  /* Die Rautiefen muessen die der Welle sein, nicht irgendwelche. */
  const gefordert = forderungen.map((f) => f.rz).sort();
  const imBild = (w.WELLE.rauheiten || [])
    .map((r) => Number(String(r.text).replace('Rz ', '').replace(',', '.')));
  p('die Rautiefen stehen auch in der Zeichnung',
    imBild.every((rz) => gefordert.indexOf(rz) >= 0),
    'Bild ' + imBild.join(', ') + ' / Aufgabe ' + gefordert.join(', '));

  /* Teil 2: was der kleinere Eckenradius kostet. */
  setz('gF', w.eval('F_ZWEI').toFixed(2));
  setz('gU4', w.eval('U_VIER'));
  setz('gU8', w.eval('U_ZWEI'));
  d.getElementById('btn2').click();
  p('der Zeitverlust wird richtig gerechnet',
    /3 von 3 richtig/.test(d.getElementById('bilanz2').textContent),
    d.getElementById('bilanz2').textContent);
  p('der kleinere Eckenradius kostet auch wirklich mehr',
    w.eval('U_ZWEI') > w.eval('U_VIER'),
    w.eval('U_VIER') + ' -> ' + w.eval('U_ZWEI') + ' Umdrehungen');

  /* Teil 3: die Grenze. */
  const eng = w.eval('R_ENG');
  setz('hRw', eng);
  setz('hMax', Math.round((eng - 0.1) * 100) / 100);
  setz('hNorm', String(w.eval('R_ECKE')));
  setz('hFmin', 0.1);
  setz('hRz', w.eval('rautiefe(0.1, R_ECKE)').toFixed(1));
  d.getElementById('btn3').click();
  p('die Grenze wird richtig bestimmt',
    /5 von 5 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);
  w.close();
}

console.log('\nDie Uebung zur Hauptnutzungszeit');
{
  const datei = '05-wie-lange-dauert-das.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;
  const hol = (id) => w.eval(
    'VORGAENGE.filter(function(x){ return x.id === "' + id + '"; })[0]');

  const vorgaenge = w.eval('VORGAENGE');
  p('fuenf Vorgaenge werden gerechnet', vorgaenge.length === 5,
    String(vorgaenge.length));

  /* Der Vorschubweg ist die Stelle, an der es schiefgeht. Jeder Fall muss
     An- und Ueberlauf enthalten - keiner darf L = l sein. */
  const LA = w.eval('LA');
  const ohne = vorgaenge.filter((v) => v.L <= 0.001);
  p('jeder Weg ist groesser als null', ohne.length === 0);
  p('An- und Ueberlauf sind angesetzt', LA >= 1 && LA <= 2, String(LA));

  let summe = 0;
  vorgaenge.forEach((v) => {
    const t = w.eval('sekunden(VORGAENGE.filter(function(x){'
      + ' return x.id === "' + v.id + '"; })[0])');
    summe += t;
    d.getElementById('w_' + v.id).value = v.L.toFixed(1);
    d.getElementById('t_' + v.id).value = t.toFixed(1);
  });
  d.getElementById('zSumme').value = summe.toFixed(1);
  d.getElementById('btn1').click();
  d.getElementById('btn2').click();
  p('die Vorschubwege werden erkannt',
    /5 von 5 richtig/.test(d.getElementById('bilanz1').textContent),
    d.getElementById('bilanz1').textContent);
  p('die Zeiten und ihre Summe ebenso',
    /6 von 6 richtig/.test(d.getElementById('bilanz2').textContent),
    d.getElementById('bilanz2').textContent);

  /* Die Drehzahlen muessen Stufen der Maschine sein - die Spannwelle ist
     duenn genug, dass die Rechnung darueber hinausgeht. */
  const stufen = w.eval('STUFEN');
  const fremd = vorgaenge.filter((v) => stufen.indexOf(
    w.eval('n(VORGAENGE.filter(function(x){ return x.id === "' + v.id
      + '"; })[0])')) < 0);
  p('jede Drehzahl ist eine Stufe der Maschine', fremd.length === 0,
    fremd.map((v) => v.id).join(', '));

  /* Teil 3: der doppelte Vorschub. Halbe Zeit, vierfache Rautiefe. */
  const tn = w.eval('T_NORMAL'), td = w.eval('T_DOPPELT');
  const rz = w.eval('RZ_DOPPELT');
  p('der doppelte Vorschub halbiert die Zeit',
    Math.abs(td - tn / 2) < 0.01, tn.toFixed(1) + ' -> ' + td.toFixed(1));
  p('und vervierfacht die Rautiefe', Math.abs(rz - 16) < 0.2, rz.toFixed(1));
  d.getElementById('dT').value = td.toFixed(1);
  d.getElementById('dS').value = (tn - td).toFixed(1);
  d.getElementById('dRz').value = rz.toFixed(1);
  d.getElementById('dOk').value = 'nein';
  d.getElementById('btn3').click();
  p('und die Rechnung wird erkannt',
    /4 von 4 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);
  w.close();
}

console.log('\nDie Uebung zu den Passungen');
{
  const datei = '06-auf-welches-mass-wird-geschlichtet.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;

  const passungen = w.eval('PASSUNGEN');
  p('die Spannwelle traegt zwei Passungen', passungen.length === 2,
    passungen.map((x) => x.nennmass + ' ' + x.klasse).join(', '));
  p('eine mit Spiel, eine mit Uebermass',
    passungen.some((x) => x.es < 0) && passungen.some((x) => x.ei > 0),
    passungen.map((x) => x.art).join(', '));

  /* Der Durchmesser 18 liegt genau auf der Bereichsgrenze - es gilt die
     untere Zeile. Das ist die Falle der Uebung. */
  const n6 = passungen.filter((x) => x.klasse === 'n6')[0];
  p('der Ø18 nimmt die Zeile ueber 10 bis 18',
    n6 && /10 bis 18/.test(n6.bereich), n6 ? n6.bereich : 'kein n6');

  passungen.forEach((x) => {
    d.getElementById('a_' + x.id + '_es').value = String(x.es);
    d.getElementById('a_' + x.id + '_ei').value = String(x.ei);
    d.getElementById('m_' + x.id + '_h').value = x.hoechst.toFixed(3);
    d.getElementById('m_' + x.id + '_m').value = x.mindest.toFixed(3);
    d.getElementById('m_' + x.id + '_z').value = x.mitte.toFixed(4);
  });
  d.getElementById('btn1').click();
  d.getElementById('btn2').click();
  p('die Grenzabmasse werden erkannt',
    /4 von 4 richtig/.test(d.getElementById('bilanz1').textContent),
    d.getElementById('bilanz1').textContent);
  p('Grenzmasse und Zielmass ebenso',
    /6 von 6 richtig/.test(d.getElementById('bilanz2').textContent),
    d.getElementById('bilanz2').textContent);

  const teile = w.eval('TEILE');
  p('vier Teile werden beurteilt', teile.length === 4);
  p('und alle drei Urteile kommen vor',
    new Set(teile.map((t) => t.soll)).size === 3,
    teile.map((t) => t.soll).join(', '));
  /* Das Teil, das genau auf Nennmass liegt, muss Ausschuss sein - sonst
     faellt der wichtigste Punkt der Uebung unter den Tisch. */
  const aufNenn = teile.filter((t) => t.ist === t.p.nennmass)[0];
  p('das Teil auf Nennmass ist Ausschuss',
    aufNenn && aufNenn.soll === 'ausschuss',
    aufNenn ? aufNenn.soll : 'keines auf Nennmass');
  teile.forEach((t, i) => { d.getElementById('u_' + i).value = t.soll; });
  d.getElementById('btn3').click();
  p('die Urteile werden erkannt',
    /4 von 4 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);
  w.close();
}

console.log('\nDie Uebung zu den Pruefschritten');
{
  const datei = '07-womit-wird-das-geprueft.html';
  const dom = new JSDOM(mitAssets(fs.readFileSync(
    path.join(BASIS, 'uebungen/drehprozess', datei), 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/' + datei,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;

  const masse = w.eval('MASSE');
  p('fuenf Masse werden beurteilt', masse.length === 5, String(masse.length));
  p('zwei davon mit Kurzzeichen',
    masse.filter((m) => m.kurzzeichen).length === 2);

  /* Die Passungen muessen die Buegelmessschraube verlangen, die groben
     Masse den Messschieber - sonst haette die Uebung keine Pointe. */
  masse.forEach((m) => {
    d.getElementById('t_' + m.id).value = String(Math.round(m.weite * 1000));
    d.getElementById('g_' + m.id).value = w.eval('groebstes(' + m.weite + ').id');
  });
  d.getElementById('btn1').click();
  p('Toleranzweiten und Messmittel werden erkannt',
    /10 von 10 richtig/.test(d.getElementById('bilanz1').textContent),
    d.getElementById('bilanz1').textContent);
  const passungMittel = masse.filter((m) => m.kurzzeichen)
    .map((m) => w.eval('groebstes(' + m.weite + ').id'));
  p('fuer die Passungen reicht kein Messschieber',
    passungMittel.every((id) => id === 'bms' || id === 'bmsn'),
    passungMittel.join(', '));

  /* Die Ziehliste: drei Pruefschritte sitzen falsch und muessen wandern. */
  const karten = () => [...d.querySelectorAll('#ablaufListe li')];
  p('zehn Karten liegen bereit', karten().length === 10,
    String(karten().length));
  p('drei davon sind Pruefschritte',
    karten().filter((k) => k.classList.contains('pruefen')).length === 3);
  p('jede laesst sich ziehen',
    karten().every((k) => k.getAttribute('draggable') === 'true'));
  p('jede ist mit der Tastatur erreichbar',
    karten().every((k) => k.getAttribute('tabindex') === '0'));
  p('die Startreihenfolge ist noch nicht richtig',
    w.eval('reihenfolge').some((nr, i) => nr !== i + 1),
    w.eval('reihenfolge').join(' '));

  for (let runde = 0; runde < 40; runde++) {
    const r = w.eval('reihenfolge');
    let getan = false;
    for (let i = 0; i < r.length; i++) {
      if (r[i] !== i + 1) {
        w.eval('schieben(' + r.indexOf(i + 1) + ', ' + i + ')');
        getan = true;
        break;
      }
    }
    if (!getan) break;
  }
  d.getElementById('btnAblauf').click();
  p('sie laesst sich sortieren',
    /Alle zehn an der richtigen Stelle/.test(
      d.getElementById('bilanzAblauf').textContent),
    d.getElementById('bilanzAblauf').textContent);

  /* Neu mischen darf keinen Pruefschritt an seinem Platz stehen lassen. */
  let gut = true;
  const pruefNr = w.eval('ABLAUF').filter((v) => v.pruefen).map((v) => v.nr);
  for (let i = 0; i < 20; i++) {
    d.getElementById('btnAblaufNeu').click();
    const r = w.eval('reihenfolge');
    if (r.some((nr, k) => nr === k + 1 && pruefNr.indexOf(nr) >= 0)) gut = false;
  }
  p('nach dem Mischen steht kein Pruefschritt zufaellig richtig', gut);

  /* Die Pruefmasse: die Mitte der Toleranz und das Schruppmass. */
  const pm = w.eval('PRUEFMASSE');
  p('drei Pruefmasse sind gefragt', pm.length === 3, String(pm.length));
  pm.forEach((x) => { d.getElementById('p_' + x.id).value = x.soll.toFixed(4); });
  d.getElementById('btn3').click();
  p('die Pruefmasse werden erkannt',
    /3 von 3 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);
  w.close();
}

console.log('\nDie Freistiche - gegen DIN 509 und DIN 76-1');
{
  const SCHLUSS = '<' + '/script>';
  const quellen = ['zeichnen.js', 'wellen.js', 'drehteil.js'].map((f) =>
    '<script>' + fs.readFileSync(path.join(BASIS, 'assets', f), 'utf8')
      .split(SCHLUSS).join('<\\/script>') + SCHLUSS).join('');
  const wellen = new JSDOM('<!doctype html>' + quellen,
    { runScripts: 'dangerously' }).window.WELLEN;

  if (!ALLES.freistiche_din_509 || !ALLES.gewindeauslauf_din_76) {
    p('die Normdaten liegen vor', false, 'freistiche_din_509 fehlt');
  } else {
    const din509 = ALLES.freistiche_din_509;
    const din76 = ALLES.gewindeauslauf_din_76.freistich.stufen;

    /* Der Gewindefreistich: Laenge zwischen g1 und g2, Durchmesser und
       Rundung nach Steigung. */
    Object.keys(wellen).forEach((name) => {
      const w = wellen[name];
      const gf = w.gewindefreistich;
      if (!gf || !w.gewinde) return;
      const stufe = din76.filter((s) => Math.abs(s.P - w.gewinde.P) < 1e-9)[0];
      p(name + ': die Steigung steht in DIN 76-1', !!stufe,
        'P = ' + w.gewinde.P);
      if (!stufe) return;

      const laenge = gf.bis - gf.von;
      p(name + ': der Gewindefreistich ist lang genug',
        laenge >= stufe.g1_min - 1e-9 && laenge <= stufe.g2_max + 1e-9,
        laenge + ' mm, erlaubt ' + stufe.g1_min + ' bis ' + stufe.g2_max);

      /* "d - 1,6" aus der Tabelle in eine Zahl. */
      const abzug = Number(stufe.dg.replace('d - ', '').replace(',', '.'));
      p(name + ': der Durchmesser im Freistich stimmt',
        Math.abs(gf.dg - (w.gewinde.d - abzug)) < 0.01,
        gf.dg + ' gegen ' + (w.gewinde.d - abzug));
      p(name + ': und die Rundung darin',
        Math.abs(gf.r - stufe.r) < 1e-9, gf.r + ' gegen ' + stufe.r);
    });

    /* Die Freistiche nach DIN 509: Radius und Einstichtiefe muessen als
       Paar in der Tabelle stehen, und der Durchmesser, an dem der
       Freistich sitzt, im zugeordneten Bereich liegen. */
    const zeilen = din509.E_und_F;
    Object.keys(wellen).forEach((name) => {
      const w = wellen[name];
      (w.freistiche || []).forEach((f) => {
        const zeile = zeilen.filter((z) =>
          Math.abs((z.r_reihe1 || z.r_reihe2) - f.r) < 1e-9
          && Math.abs(z.t1 - f.tiefe) < 1e-9)[0];
        p(name + ': ' + f.norm + ' steht so in DIN 509', !!zeile,
          'r = ' + f.r + ', t1 = ' + f.tiefe);
        if (!zeile) return;

        /* Der Durchmesser, in dem der Freistich sitzt: der kleinere der
           beiden Abschnitte am Uebergang. */
        const d = Math.min.apply(null, w.abschnitte
          .filter((a) => a.von === f.bei || a.bis === f.bei)
          .map((a) => a.d));
        const bereich = zeile.d1_ueblich || zeile.d1_wechselfest || '';
        const m = bereich.match(/>([0-9,]+)(?: bis ([0-9,]+))?/);
        if (!m) return;
        const von = Number(m[1].replace(',', '.'));
        const bis = m[2] ? Number(m[2].replace(',', '.')) : Infinity;
        p(name + ': und passt zum Durchmesser ' + d,
          d > von - 1e-9 && d <= bis + 1e-9, 'erlaubt ' + bereich);

        /* Und er sitzt an einem echten Uebergang, nicht im Nichts. */
        p(name + ': der Freistich sitzt an einer Schulter',
          w.abschnitte.some((a) => a.bis === f.bei),
          'bei ' + f.bei + ' mm');
      });
    });

    /* Kein Uebergang traegt zwei Freistiche - das war ein Fehler in den
       Daten der Antriebswelle. */
    Object.keys(wellen).forEach((name) => {
      const w = wellen[name];
      const stellen = (w.freistiche || []).map((f) => f.bei);
      if (w.gewindefreistich) stellen.push(w.gewindefreistich.von);
      p(name + ': kein Uebergang traegt zwei Freistiche',
        new Set(stellen).size === stellen.length, stellen.join(', '));
    });

    /* Und die engste Innenrundung ist wirklich die engste - egal ob sie
       aus einem Freistich oder einer freien Rundung kommt. */
    Object.keys(wellen).forEach((name) => {
      const w = wellen[name];
      const radien = (w.freistiche || []).map((f) => f.r)
        .concat((w.rundungen || []).map((r) => r.r));
      if (!radien.length) return;
      p(name + ': der kleinste Innenradius ist der kleinste',
        Math.abs(Math.min.apply(null, radien) - w.kleinsterInnenradius) < 1e-9,
        radien.join(', ') + ' gegen ' + w.kleinsterInnenradius);
    });
  }
}

console.log('\nDie engste Innenrundung - jede Welle ihre eigene');
{
  /* Die Kette, um die es geht: Die engste Innenrundung der Kontur begrenzt
     den Eckenradius des Werkzeugs, das die Kontur erzeugt - r_eps <= r_w
     minus 0,1 mm, abgerundet auf die naechstkleinere genormte Groesse.

     Der Fehler, der nicht zurueckkommen soll: die auffaelligste Rundung
     fuer die engste halten. An der Antriebswelle sind das die Freistiche
     DIN 509 - E 0,6 x 0,3, deren Radius gar nicht als Radius dasteht; an
     der Spannwelle die kleine R1 am unscheinbaren Absatz.

     Geprueft wird gegen assets/wellen.js, nicht gegen eine Zahl im Test -
     sonst muesste man an zwei Stellen nachziehen. */
  const GENORMT = [0.2, 0.4, 0.6, 0.8, 1.2, 1.6];
  const groesste = (rw) => GENORMT.filter((r) => r <= rw - 0.1 + 1e-9).pop();

  const SCHLUSS = '<' + '/script>';
  const quellen = ['zeichnen.js', 'wellen.js', 'drehteil.js'].map((f) =>
    '<script>' + fs.readFileSync(path.join(BASIS, 'assets', f), 'utf8')
      .split(SCHLUSS).join('<\\/script>') + SCHLUSS).join('');
  const wellen = new JSDOM('<!doctype html>' + quellen,
    { runScripts: 'dangerously' }).window.WELLEN;

  const stellen = [
    ['uebungen/drehprozess/03-eine-wendeschneidplatte-lesen.html', 'spannwelle'],
    ['uebungen/drehprozess/04-wie-fein-muss-der-vorschub-sein.html', 'spannwelle'],
    ['lernsituationen/antriebswelle/index.html', 'antriebswelle'],
  ];
  stellen.forEach((s) => {
    const kurz = path.basename(s[0]);
    const welle = wellen[s[1]];
    const text = fs.readFileSync(path.join(BASIS, s[0]), 'utf8');
    const m = text.match(/var R_ENG = ([0-9.]+)/);
    p(kurz + ': nennt die engste Innenrundung',
      m && Math.abs(Number(m[1]) - welle.kleinsterInnenradius) < 1e-9,
      m ? m[1] + ' statt ' + welle.kleinsterInnenradius : 'kein R_ENG');
    const e = text.match(/var R_ECKE = ([0-9.]+)/);
    p(kurz + ': und den groessten genormten Eckenradius dazu',
      e && Math.abs(Number(e[1]) - groesste(welle.kleinsterInnenradius)) < 1e-9,
      e ? e[1] + ' statt ' + groesste(welle.kleinsterInnenradius)
        : 'kein R_ECKE');
  });

  /* Die Antriebswelle traegt die Freistiche - und nur bei ihr darf die
     Bezeichnung als Fundstelle auftreten. Auf den anderen Seiten steht sie
     als Hinweis, nicht als Rechengrundlage. */
  const ls = fs.readFileSync(
    path.join(BASIS, 'lernsituationen/antriebswelle/index.html'), 'utf8');
  p('die Lernsituation nennt den Freistich als engste Stelle',
    /DIN 509/.test(ls) && /Freistich/.test(ls));

  const baustein = fs.readFileSync(path.join(BASIS, 'assets/wellen.js'), 'utf8');
  const teil = baustein.slice(baustein.indexOf('WELLEN.antriebswelle'),
                              baustein.indexOf('WELLEN.mitnehmerwelle'));
  p('und der Zeichenbaustein kennt ihren Radius',
    /kleinsterInnenradius:\s*0\.6/.test(teil)
    && (teil.match(/r:\s*0\.6/g) || []).length === 2);

  /* Und die vier Wellen sind wirklich verschieden - sonst waeren die
     Ergebnisse von Lektion, Uebung und Lernsituation wieder dieselben. */
  const radien = Object.keys(wellen).map((k) => wellen[k].kleinsterInnenradius);
  p('keine zwei Wellen haben dieselbe engste Rundung',
    new Set(radien).size === radien.length, radien.join(', '));
  const stoffe = Object.keys(wellen).map((k) => wellen[k].werkstoff);
  p('und keine zwei denselben Werkstoff',
    new Set(stoffe).size === stoffe.length, stoffe.join(', '));
}

console.log('\nAlle Wellen lassen sich zeichnen');
{
  /* Solange eine Welle auf keiner Seite steht, sieht die Zeichnungspruefung
     sie nicht. Also wird hier jede einmal gezeichnet - mit Massen, mit
     Benennungen und mit Rohteil - und nachgesehen, ob alles innerhalb der
     Zeichenflaeche liegt, die wellenGroesse dafuer angibt. Laeuft etwas
     hinaus, schneidet der Browser es ab. */
  const SCHLUSS = '<' + '/script>';
  const quellen = ['zeichnen.js', 'wellen.js', 'drehteil.js'].map((f) =>
    '<script>' + fs.readFileSync(path.join(BASIS, 'assets', f), 'utf8')
      .split(SCHLUSS).join('<\\/script>') + SCHLUSS).join('');
  const dom = new JSDOM('<!doctype html><body><div id="z"></div>' + quellen,
    { runScripts: 'dangerously' });
  const w = dom.window;

  const namen = Object.keys(w.WELLEN);
  p('es sind mehrere Wellen', namen.length >= 3, namen.join(', '));

  const faelle = [
    { masse: true, rauheiten: true },
    { bezeichnungen: true },
    { rohteil: true, masse: true },
  ];

  namen.forEach((name) => {
    const welle = w.WELLEN[name];
    p(name + ': hat Kontur, Flaechen und Masse',
      welle.abschnitte.length >= 3 && welle.flaechen.length >= 6
      && (welle.masse.unten || []).length >= 3);

    /* Die Abschnitte muessen lueckenlos aneinanderstossen - sonst klafft
       in der Kontur ein Loch, das niemand sieht. */
    let dicht = welle.abschnitte[0].von === 0;
    welle.abschnitte.forEach((a, i) => {
      if (i && a.von !== welle.abschnitte[i - 1].bis) dicht = false;
    });
    p(name + ': die Abschnitte stossen lueckenlos aneinander',
      dicht && welle.abschnitte[welle.abschnitte.length - 1].bis
        === welle.laenge);

    /* Jede Flaeche muss auf der Welle liegen. */
    const daneben = welle.flaechen.filter((f) => {
      const x = f.bei !== undefined ? f.bei : f.von;
      return x < 0 || x > welle.laenge;
    });
    p(name + ': jede Flaeche liegt auf der Welle', daneben.length === 0,
      daneben.map((f) => f.id).join(', '));

    /* Das Rohteil muss laenger und dicker sein als das Fertigteil. */
    let groesstD = 0;
    welle.abschnitte.forEach((a) => { if (a.d > groesstD) groesstD = a.d; });
    p(name + ': das Rohteil ist groesser als das Fertigteil',
      welle.rohteil.d > groesstD && welle.rohteil.laenge > welle.laenge,
      'Rohteil ' + welle.rohteil.d + 'x' + welle.rohteil.laenge
      + ', Teil ' + groesstD + 'x' + welle.laenge);

    faelle.forEach((o) => {
      const was = Object.keys(o).join('+');
      const g = w.wellenGroesse(welle, Object.assign({ s: 6 }, o));
      const svg = w.document.createElementNS(
        'http://www.w3.org/2000/svg', 'svg');
      w.document.getElementById('z').appendChild(svg);
      w.zeichneWelle(svg, welle,
        Object.assign({ x: g.x, y: g.y, s: 6 }, o));

      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, punkte = 0;
      svg.querySelectorAll('line, text').forEach((e) => {
        const paare = e.tagName === 'text'
          ? [[+e.getAttribute('x'), +e.getAttribute('y')]]
          : [[+e.getAttribute('x1'), +e.getAttribute('y1')],
             [+e.getAttribute('x2'), +e.getAttribute('y2')]];
        paare.forEach((xy) => {
          if (!isFinite(xy[0]) || !isFinite(xy[1])) return;
          punkte++;
          minX = Math.min(minX, xy[0]); maxX = Math.max(maxX, xy[0]);
          minY = Math.min(minY, xy[1]); maxY = Math.max(maxY, xy[1]);
        });
      });
      p(name + ' (' + was + '): alles liegt im Bild',
        punkte > 20 && minX >= -1 && minY >= -1
        && maxX <= g.breite + 1 && maxY <= g.hoehe + 1,
        punkte + ' Punkte, x ' + Math.round(minX) + '..' + Math.round(maxX)
        + ' in 0..' + Math.round(g.breite) + ', y ' + Math.round(minY)
        + '..' + Math.round(maxY) + ' in 0..' + Math.round(g.hoehe));
      svg.remove();
    });
  });
  w.close();
}

console.log('\nDie beiden Stirnflaechen');
{
  /* Welches Verfahren welche Stirnflaeche erzeugt, entscheidet die
     Aufspannung, nicht die Leserichtung der Zeichnung: Das Rohteil steckt
     links im Futter, das freie Ende liegt rechts. Rechts wird also
     querplangedreht und zentriert, links faellt die Flaeche erst beim
     Abstechen an. Die Kontur belegt es selbst - der Gewindefreistich
     DIN 76 sitzt am linken Ende des Gewindes, weil der Gewindemeissel von
     rechts nach links laeuft und dort austreten muss.

     Vertauscht man die beiden, uebt das Material eine Aufspannung ein, die
     es nicht gibt - und der Fehler zieht sich durch Uebung, Training und
     Lektion. */
  const lies = (f) => fs.readFileSync(path.join(BASIS, f), 'utf8');

  /* Und zwar bei jeder Welle - die Aufspannung ist bei allen dieselbe. */
  const daten = lies('assets/wellen.js');
  const wellen = daten.split('WELLEN.').slice(1);
  p('es gibt mehr als eine Welle', wellen.length >= 3, String(wellen.length));
  wellen.forEach((teil) => {
    const name = teil.slice(0, teil.indexOf(' '));
    const verfahren = (id) => {
      const m = teil.match(
        new RegExp('id: "' + id + '"[^]*?verfahren: "([a-z]+)"'));
      return m && m[1];
    };
    p(name + ': links wird abgestochen',
      verfahren('stirn_links') === 'abstechdrehen',
      String(verfahren('stirn_links')));
    p(name + ': rechts wird querplangedreht',
      verfahren('stirn_rechts') === 'querplandrehen',
      String(verfahren('stirn_rechts')));
  });

  const tr = lies('trainings/drehprozess/01-verfahren-erkennen.html');
  p('Training 01 haelt sich daran',
    /id:"stirn_links", verfahren:"abstechdrehen"/.test(tr)
    && /id:"stirn_rechts", verfahren:"querplandrehen"/.test(tr));

  const ue = lies('uebungen/drehprozess/01-welches-verfahren-gehoert-hierher.html');
  const soll = (name) => {
    const m = ue.match(new RegExp('name:"' + name
      + ' Stirnfl\u00e4che"[^]*?soll:"([^"]+)"'));
    return m && m[1];
  };
  p('Uebung 01: linke Stirnflaeche abstechen',
    soll('Linke') === 'Abstechdrehen', String(soll('Linke')));
  p('Uebung 01: rechte Stirnflaeche querplandrehen',
    soll('Rechte') === 'Querplandrehen', String(soll('Rechte')));

  /* Und niemand plant mehr, die linke Flaeche zuerst plan zu drehen. */
  const heikel = [
    'trainings/drehprozess/01-verfahren-erkennen.html',
    'uebungen/drehprozess/01-welches-verfahren-gehoert-hierher.html',
    'lernsituationen/antriebswelle/index.html',
  ];
  const falsch = heikel.filter(
    (f) => /[Ll]inke Stirnfl\u00e4che querplandrehen/.test(lies(f)));
  p('kein Arbeitsplan dreht die linke Stirnflaeche zuerst plan',
    falsch.length === 0, falsch.join(', '));

  const lektion = path.join(require('./orte').TOOLS,
    'fertigungstechnik-zerspanung-drehprozess-planen.html');
  if (fs.existsSync(lektion)) {
    const t = fs.readFileSync(lektion, 'utf8');
    p('die Lektion haelt sich daran',
      /stirn_links: \["Abstechdrehen"/.test(t)
      && /stirn_rechts: \["Querplandrehen"/.test(t));
    p('und ihr Ablauf nennt die rechte Flaeche zuerst',
      /Rechte Stirnfl\u00e4che querplandrehen/.test(t)
      && !/Linke Stirnfl\u00e4che querplandrehen/.test(t));
  }
}

console.log('\nDie zweite Lernsituation: die Abtriebswelle');
{
  const voll = path.join(BASIS, 'lernsituationen/abtriebswelle/index.html');
  p('die Lernsituation liegt im Repo', fs.existsSync(voll));

  const dom = new JSDOM(mitAssets(fs.readFileSync(voll, 'utf8')), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/lernsituationen/abtriebswelle/',
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  const w = dom.window, d = w.document;
  const setz = (id, wert) => { d.getElementById(id).value = String(wert); };

  /* Die Welle: Gruppe M, Kegel, Bohrung, Laengsnut. */
  p('sie zeigt die Abtriebswelle', w.WELLE.id === 'abtriebswelle', w.WELLE.id);
  p('die Welle hat einen kegeligen Abschnitt',
    w.WELLE.abschnitte.some((a) => a.dBis !== undefined));
  p('eine Innenbohrung', (w.WELLE.bohrungen || []).length === 1);
  p('und eine Laengsnut', (w.WELLE.laengsnuten || []).length === 1);

  /* Teil 3: der Werkstoff. Die Falle ist die Gruppe - M, nicht P. */
  setz('wRm', 600); setz('wG', 'M'); setz('wZ', 'b');
  d.getElementById('btn3').click();
  p('Werkstoff, Gruppe und Zeile werden erkannt',
    /3 von 3 richtig/.test(d.getElementById('bilanz3').textContent),
    d.getElementById('bilanz3').textContent);
  p('die Zeile ist eine der Gruppe M',
    /nichtrostend/.test(d.getElementById('wZ')
      .querySelector('option[value="b"]').textContent));

  /* Teil 4: die Bedingungen. Derselbe Schlichtvorgang muss schlechter
     ausfallen, wenn die Nut vorher gefraest waere - das ist der Grund
     fuer die Reihenfolge. */
  const faelle = w.eval('FAELLE');
  p('fuenf Faelle werden beurteilt', faelle.length === 5);
  faelle.forEach((f) => {
    setz('b_' + f.id, w.eval('urteil(FAELLE.filter(function(x){'
      + ' return x.id === "' + f.id + '"; })[0])'));
  });
  d.getElementById('btn4').click();
  p('die Bedingungen werden erkannt',
    /5 von 5 richtig/.test(d.getElementById('bilanz4').textContent),
    d.getElementById('bilanz4').textContent);
  const ohneNut = w.eval('urteil(FAELLE.filter(function(x){'
    + ' return x.id === "schlicht"; })[0])');
  const mitNut = w.eval('urteil(FAELLE.filter(function(x){'
    + ' return x.id === "schlichtNut"; })[0])');
  p('die vorgezogene Nut verschlechtert den Schlichtgang',
    w.eval('GRIFF')[mitNut] < w.eval('GRIFF')[ohneNut],
    ohneNut + ' -> ' + mitNut);

  /* Teil 5: Schnittdaten. Jede Zahl muss aus der M-Zeile des Buches
     stammen, und jede Drehzahl eine Stufe der Maschine sein. */
  const zeile = ALLES.zerspanung_drehen.schnittdaten_drehen.M
    .nichtrostend_austenitisch.find((z) => z.rm === '<=680');
  const paare = {plan: 'querplandrehen', schruppen: 'laengsrund_schruppen',
    schlichten: 'laengsrund_schlichten', stechen: 'abstechen_einstechen',
    gewinde: 'gewindedrehen'};
  const zellen = w.eval('ZELLE');
  const schief = Object.keys(zellen).filter((k) => JSON.stringify(zellen[k])
    !== JSON.stringify(zeile[paare[k]]));
  p('die fuenf Zellen stimmen mit dem Buch', schief.length === 0,
    schief.join(', '));

  const vorgaenge = w.eval('VORGAENGE');
  const stufen = w.eval('STUFEN');
  vorgaenge.forEach((v) => {
    const vc = w.eval('vcVon(VORGAENGE.filter(function(x){'
      + ' return x.id === "' + v.id + '"; })[0])');
    setz('vc_' + v.id, vc);
    setz('n_' + v.id, w.eval('stufe(drehzahl(' + vc + ', ' + v.d + '))'));
  });
  d.getElementById('btn5').click();
  p('alle Schnittdaten werden erkannt',
    new RegExp(vorgaenge.length * 2 + ' von ' + vorgaenge.length * 2
      + ' richtig').test(d.getElementById('bilanz5').textContent),
    d.getElementById('bilanz5').textContent);

  /* Teil 6: der Kern. Rz 4 laesst sich nicht drehen. */
  const eng = w.eval('R_ENG'), ecke = w.eval('R_ECKE');
  const noetig = w.eval('F_NOETIG'), fmin = w.eval('F_MIN');
  p('die engste Innenrundung ist die R0,3', eng === 0.3, String(eng));
  p('und laesst nur den kleinsten Eckenradius zu', ecke === 0.2, String(ecke));
  p('der Vorschub fuer Rz 4 liegt unter dem Schlichtbereich',
    noetig < fmin, noetig.toFixed(3) + ' gegen ' + fmin);
  p('mit dem kleinsten Vorschub kaeme rund Rz 6,3 heraus',
    Math.abs(w.eval('RZ_MOEGLICH') - 6.25) < 0.1,
    w.eval('RZ_MOEGLICH').toFixed(2));
  setz('gRw', eng); setz('gR', String(ecke));
  setz('gF', noetig.toFixed(2)); setz('gFmin', fmin);
  setz('gGeht', 'nein'); setz('gRz', w.eval('RZ_MOEGLICH').toFixed(2));
  d.getElementById('btn6').click();
  p('die Grenze wird richtig bestimmt',
    /6 von 6 richtig/.test(d.getElementById('bilanz6').textContent),
    d.getElementById('bilanz6').textContent);
  /* Ein Befund ohne Ausweg waere nur eine Sackgasse. Die Lernsituation
     muss einen nennen, und zwar einen belegten: einen genormten Freistich
     mit dem Vorschub, der dann im Schlichtbereich liegt. */
  const text6 = d.body.textContent;
  p('und die Loesung nennt einen belegten Ausweg',
    /DIN 509/.test(text6) && /0,14 mm/.test(text6));
  p('sowie Schleifen als Alternative', /[Ss]chleifen/.test(text6));

  /* Teil 7: eine Welle und eine Bohrung - Gross- und Kleinbuchstabe. */
  const passungen = w.eval('PASSUNGEN');
  p('eine Passung ist eine Bohrung, eine eine Welle',
    passungen.some((x) => x.bohrung) && passungen.some((x) => !x.bohrung),
    passungen.map((x) => x.klasse).join(', '));
  passungen.forEach((x) => {
    setz('p_' + x.id + '_h', x.hoechst.toFixed(3));
    setz('p_' + x.id + '_m', x.mindest.toFixed(3));
    setz('p_' + x.id + '_z', x.mitte.toFixed(4));
  });
  d.getElementById('btn7').click();
  p('die Passungen werden erkannt',
    /6 von 6 richtig/.test(d.getElementById('bilanz7').textContent),
    d.getElementById('bilanz7').textContent);

  /* Teil 10: der Arbeitsplan. Die Nut steht zuletzt, und keine Drehzahl
     blieb als Platzhalter stehen. */
  const plan = w.eval('PLAN');
  p('der Arbeitsplan hat dreizehn Vorgaenge', plan.length === 13,
    String(plan.length));
  p('keine Drehzahl blieb bei null stehen',
    !/n = 0 1\/min/.test(d.getElementById('planLoesung').textContent));
  const genannt = [...d.getElementById('planLoesung').textContent
    .matchAll(/n = (\d+) 1\/min/g)].map((m) => Number(m[1]));
  const fremd = genannt.filter((n) => stufen.indexOf(n) < 0);
  p(genannt.length + ' Drehzahlen sind Stufen der Maschine',
    fremd.length === 0, fremd.join(', '));
  p('die Passfedernut steht als letzter Vorgang',
    /Passfedernut/.test(plan[plan.length - 1].vorgang),
    plan[plan.length - 1].vorgang);
  const pruefzeilen = plan.filter((z) => /^Pr\u00fcfen:/.test(z.vorgang));
  p('mindestens drei Vorgaenge sind Pruefschritte', pruefzeilen.length >= 3,
    pruefzeilen.map((z) => z.nr).join(', '));

  /* Teil 11: die Zeit. Das Schruppen dauert laenger als alles andere. */
  const zeiten = w.eval('ZEITEN');
  let summe = 0;
  zeiten.forEach((z) => {
    const t = w.eval('zeitSekunden(ZEITEN.filter(function(x){'
      + ' return x.id === "' + z.id + '"; })[0])');
    summe += t;
    setz(z.id + '_L', z.L.toFixed(1));
    setz(z.id + '_t', t.toFixed(1));
  });
  setz('zSumme', summe.toFixed(1));
  d.getElementById('btn11').click();
  p('Vorschubwege und Zeiten werden erkannt',
    /7 von 7 richtig/.test(d.getElementById('bilanz11').textContent),
    d.getElementById('bilanz11').textContent);
  const schrupp = w.eval('zeitSekunden(ZEITEN.filter(function(x){'
    + ' return x.id === "zschrupp"; })[0])');
  p('das Schruppen dauert laenger als der Rest zusammen',
    schrupp > summe - schrupp, schrupp.toFixed(1) + ' von '
    + summe.toFixed(1) + ' s');
  w.close();
}

console.log('\nDie Lektion im Werkzeug-Repo');
{
  const { TOOLS, teilweise } = require('./orte');
  if (teilweise(TOOLS, 'die Werkzeuge')) {
    const datei = path.join(TOOLS,
      'fertigungstechnik-zerspanung-drehprozess-planen.html');
    p('die Lektion liegt im Werkzeug-Repo', fs.existsSync(datei));
    if (fs.existsSync(datei)) {
      const text = fs.readFileSync(datei, 'utf8');
      p('sie ist als Lektion gekennzeichnet',
        /name="art" content="lektion"/.test(text));
      p('sie hat alle Schritte als Reiter',
        ['kontur', 'werkstoff', 'schnitt', 'werkzeug', 'vorschub', 'passung',
         'zeit', 'pruefen', 'hinweise']
          .every((r) => text.indexOf('data-tab="' + r + '"') > 0));
      p('sie nennt ihre Quellen', /Tabellenbuch Metall/.test(text));

      /* Die Lektion verweist auf Werkzeuge, die es schon gibt. Ein Verweis
         ins Leere ist schlimmer als keiner: Er sieht aus wie ein Angebot. */
      const verweise = [];
      [...text.matchAll(/<p class="tool">([^]*?)<\/p>/g)].forEach((kasten) => {
        [...kasten[1].matchAll(/href="([^"]+)"/g)]
          .forEach((a) => verweise.push(a[1]));
      });
      const tot = verweise.filter(
        (v) => !fs.existsSync(path.join(TOOLS, v)));
      p('jeder Werkzeugverweis trifft eine Datei', tot.length === 0,
        tot.join(', '));
      p('und es sind mindestens fuenf', verweise.length >= 5,
        String(verweise.length));

      /* Geladen und bedient: Zu jeder Flaeche der Welle muss die Lektion
         sagen koennen, welches Verfahren sie erzeugt. Wechselt die Welle
         und die Begruendungen bleiben stehen, zeigt der halbe Knopfsatz
         den Platzhaltertext - und niemand merkt es. */
      const dom = new JSDOM(mitTools(text, TOOLS), {
        runScripts: 'dangerously',
        url: 'https://t-bk.de/werkzeuge/tools/'
             + 'fertigungstechnik-zerspanung-drehprozess-planen.html',
      });
      const w = dom.window, d = w.document;
      const knoepfe = [...d.querySelectorAll('#flaechenknoepfe button')];
      p('die Lektion zeigt Flaechenknoepfe', knoepfe.length >= 7,
        String(knoepfe.length));
      p('so viele, wie die Welle Flaechen hat',
        knoepfe.length === w.WELLE.flaechen.length,
        knoepfe.length + ' Knoepfe, ' + w.WELLE.flaechen.length + ' Flaechen');

      const ohne = knoepfe.filter((b) => {
        b.click();
        const t = d.getElementById('flaecheInfo').textContent;
        b.click();
        return /Eine Fl\u00e4che w\u00e4hlen/.test(t) || t.trim().length < 40;
      });
      p('jede Flaeche hat ihre Begruendung', ohne.length === 0,
        ohne.map((b) => b.dataset.f).join(', '));

      p('sie zeigt die Welle, die sie meint',
        w.WELLE.id === 'mitnehmerwelle', w.WELLE.id);
      p('und rechnet mit deren Werkstoff',
        /C45E/.test(text) && w.WELLE.werkstoff === 'C45E');

      /* Die Reiter Passung, Zeit und Pruefen rechnen - also wird gerechnet.
         Ein Regler, den man setzt, muss sein Ereignis bekommen; sonst
         steht im Kasten noch das Ergebnis des Startwertes. */
      const setz = (id, wert) => {
        const e = d.getElementById(id);
        e.value = String(wert);
        e.dispatchEvent(new w.Event('input', { bubbles: true }));
        e.dispatchEvent(new w.Event('change', { bubbles: true }));
      };
      const inhalt = (id) => d.getElementById(id).textContent
        .replace(/\s+/g, ' ');

      /* Passung: 32 k6 hat es = +18, ei = +2 Mikrometer (Nennmassbereich
         ueber 30 bis 50). Daraus 32,018 / 32,002, Mitte 32,010. */
      setz('tN', 32); setz('tK', 'k6');
      const passung = inhalt('passungInfo');
      p('der Passungsreiter liest die Grenzabmasse',
        /32,018/.test(passung) && /32,002/.test(passung), passung.slice(0, 120));
      p('und nennt das Mittenmass', /Mittenma\u00df = 32,010/.test(passung));
      p('die Toleranzweite stimmt', /16 \u00b5m/.test(passung));

      /* 20 f7: es = -20, ei = -41 -> 19,980 / 19,959, Mitte 19,970. */
      setz('tN', 20); setz('tK', 'f7');
      const f7 = inhalt('passungInfo');
      p('auch bei einer Spielpassung',
        /19,980/.test(f7) && /19,959/.test(f7) && /19,970/.test(f7),
        f7.slice(0, 120));

      /* Zeit: das durchgerechnete Beispiel der Seite 354 - Laengsrunddrehen
         mit Ansatz, d = 42 mm, l = 50 mm, v_c = 130 m/min, f = 0,3 mm,
         i = 2. Das Buch kommt auf L = 52 mm, n = 985 1/min, t_h = 0,35 min.
         Trifft die Lektion das, stimmt die ganze Kette. */
      setz('zF', 'laengs_mit'); setz('zL', 50); setz('zD', 42);
      setz('zV', 130); setz('zVor', 0.3); setz('zI', 2);
      const zeit = inhalt('zeitInfo');
      p('der Zeitreiter trifft den Vorschubweg des Buches',
        /52,0 mm/.test(zeit), zeit.slice(0, 140));
      p('und die Drehzahl', /985 1\/min/.test(zeit));
      p('und die Hauptnutzungszeit', /0,35 min/.test(zeit));

      /* Querplandrehen rechnet mit dem mittleren Durchmesser d/2. */
      setz('zF', 'plan_voll'); setz('zD', 40); setz('zV', 200);
      const plan = inhalt('zeitInfo');
      p('beim Querplandrehen mit dem mittleren Durchmesser',
        /d<sub>m<\/sub> = d\/2/.test(d.getElementById('zeitInfo').innerHTML)
        && /\u00b7 20,0/.test(plan), plan.slice(0, 140));

      /* Pruefen: 16 Mikrometer Weite sind 1,6 Schritte einer
         Buegelmessschraube - und weniger als ein Schritt eines
         Messschiebers. */
      setz('mN', 32); setz('mK', 'k6');
      const liste = inhalt('messmittelListe');
      p('der Pruefreiter zaehlt die Ablesungsschritte',
        /1,6 Schritte/.test(liste), liste.slice(0, 160));
      p('und nennt den Messschieber hier untauglich',
        (liste.match(/gr\u00f6ber als die ganze Toleranz/g) || []).length === 2);
      w.close();
    }
    /* Der Zeichenbaustein liegt in beiden Repos - er muss derselbe sein,
       sonst zeichnet die Lektion eine andere Welle als die Uebungen. */
    [['assets/zeichnen.js', 'zeichnen.js'],
     ['assets/wellen.js', 'wellen.js'],
     ['assets/drehteil.js', 'drehteil.js']].forEach((paar) => {
      const hier = fs.readFileSync(path.join(BASIS, paar[0]), 'utf8');
      const dort = path.join(TOOLS, 'assets', paar[1]);
      p(paar[1] + ' ist in beiden Repos derselbe',
        fs.existsSync(dort) && fs.readFileSync(dort, 'utf8') === hier);
    });
  }
}

console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
process.exit(fehler ? 1 : 0);
