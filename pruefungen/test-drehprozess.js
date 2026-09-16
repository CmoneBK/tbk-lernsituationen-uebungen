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

console.log('\nDie Uebungen');
{
  const ORDNER = path.join(BASIS, 'uebungen/drehprozess');
  const dateien = fs.readdirSync(ORDNER)
    .filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
  p('vier Uebungen liegen im Paket', dateien.length === 4, dateien.join(', '));

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

  p('der Arbeitsplan hat acht Vorgaenge',
    d.querySelectorAll('#arbeitsplan tr').length === 8,
    String(d.querySelectorAll('#arbeitsplan tr').length));
  p('und drei Felder je Zeile zum Ausfuellen',
    d.querySelectorAll('#arbeitsplan textarea').length === 24,
    String(d.querySelectorAll('#arbeitsplan textarea').length));
  p('die Werkzeugliste steht bereit',
    d.querySelectorAll('#werkzeugliste tr').length >= 6);
  p('die Musterloesung des Arbeitsplans ist vollstaendig',
    d.querySelectorAll('#planLoesung tr').length === 8);

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
      p('sie hat die fuenf Schritte als Reiter',
        ['kontur', 'werkstoff', 'schnitt', 'werkzeug', 'vorschub', 'hinweise']
          .every((r) => text.indexOf('data-tab="' + r + '"') > 0));
      p('sie nennt ihre Quellen', /Tabellenbuch Metall/.test(text));

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
