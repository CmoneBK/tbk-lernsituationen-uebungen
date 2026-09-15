/* Liegt eine Beschriftung im Weg?
 *
 * Diese Prüfung läuft als einzige nicht in jsdom, sondern in einem echten
 * Browser. Der Grund ist einfach: Ob ein Text auf einer Linie liegt, hängt
 * davon ab, wie breit er gesetzt wird und wo die Linie verläuft - und beides
 * weiß nur der Browser. jsdom kennt keine Schriftmaße und keine Pfadlängen.
 *
 * Gemessen wird mit beschriftung-messer.js; was dort geprüft wird, steht in
 * dessen Kopf. Hier steht nur, wie die Seiten dort hineinkommen: Neben jede
 * Seite wird eine Kopie mit dem Messer gelegt, Chrome lädt sie, gibt den
 * fertigen DOM aus, und die Befunde werden aus einem eingehängten Feld
 * gelesen. Die Kopie wird danach gelöscht.
 *
 * Ohne Chrome ist nichts zu prüfen - das ist kein Fehler im Material, also
 * meldet sich die Prüfung ab, wie die Prüfungen der Nachbar-Repos auch.
 */
const fs = require('fs'), path = require('path');
const { execFile } = require('child_process');
const { MATERIAL, TOOLS, teilweise } = require('./orte');

const MESSER = fs.readFileSync(path.join(__dirname, 'beschriftung-messer.js'), 'utf8');

/* Die helle Palette ist die echte: Die dunkle entsteht aus ihr durch einen
   Filter über die ganze Seite. Gemessen wird deshalb hell. */
const KOPF = '<script>try{localStorage.setItem("tbk-thema","hell");}catch(e){}<' + '/script>';

/* Vier Browser gleichzeitig. Eine Seite nach der anderen dauert eine
   Viertelstunde - länger, als eine Prüfung laufen darf. */
const SPUREN = 4;

function chrome() {
  const kandidaten = [
    process.env.TBK_CHROME,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return kandidaten.find((k) => fs.existsSync(k)) || null;
}

function seiten() {
  const aus = [];
  const sammeln = (ordner) => {
    if (!fs.existsSync(ordner)) return;
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) sammeln(p);
      else if (/\.html$/.test(e.name)) aus.push(p);
    }
  };
  ['uebungen', 'trainings', 'lernsituationen'].forEach(
    (o) => sammeln(path.join(MATERIAL, o)));
  sammeln(TOOLS);
  return aus.filter((p) => !path.basename(p).startsWith('_')).sort();
}

function auswerten(dom) {
  const m = dom.match(/<pre id="__befunde">([\s\S]*?)<\/pre>/);
  if (!m) return null;
  const roh = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  try { return JSON.parse(roh); } catch (e) { return null; }
}

/* Jede Spur bekommt ihren eigenen Dateinamen - sonst schreiben sich zwei
   gleichzeitig laufende Browser die Kopie weg. */
function pruefe(exe, datei, spur) {
  const kopie = path.join(path.dirname(datei), '_beschriftung-' + spur + '.html');
  const quelle = fs.readFileSync(datei, 'utf8')
    .replace('<head>', '<head>\n' + KOPF)
    .replace('</body>', '<script>\n' + MESSER + '\n<' + '/script>\n</body>');
  fs.writeFileSync(kopie, quelle);
  const url = 'file:///' + kopie.replace(/\\/g, '/').replace(/ /g, '%20');
  return new Promise((los) => {
    execFile(exe, ['--headless=new', '--disable-gpu', '--no-sandbox',
      '--virtual-time-budget=40000', '--window-size=1400,2000', '--dump-dom', url],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 240000 },
    (fehler, aus) => {
      try { fs.unlinkSync(kopie); } catch (e) { /* egal */ }
      los(auswerten((aus || '').toString()));
    });
  });
}

async function alleMessen(exe, dateien) {
  const ergebnis = new Array(dateien.length);
  let naechste = 0;
  async function arbeiter(spur) {
    for (;;) {
      const i = naechste++;
      if (i >= dateien.length) return;
      ergebnis[i] = await pruefe(exe, dateien[i], spur);
    }
  }
  const spuren = [];
  for (let i = 0; i < SPUREN; i++) spuren.push(arbeiter(i));
  await Promise.all(spuren);
  return ergebnis;
}

/* Bewusste Ausnahmen. Im Schraffur-Schnellcheck gehört die Maßzahl mitten
   ins schraffierte Feld - genau daran soll der Lernende sehen, ob die
   Schraffur dort ausgespart wurde. In der falschen Fassung liegt sie
   absichtlich darauf. */
const ERLAUBT = [
  { datei: '03-schraffur-schnellcheck.html', text: '28' },
];

function erlaubt(datei, b) {
  return ERLAUBT.some((a) => datei.endsWith(a.datei)
    && (b.text || '').indexOf(a.text) === 0);
}

async function lauf() {
  const exe = chrome();
  if (!exe) {
    console.log('  ohne   Beschriftungsmessung: kein Chrome gefunden '
      + '(Pfad notfalls in TBK_CHROME)');
    console.log('\nnichts zu pruefen');
    return 0;
  }
  const mitWerkzeugen = teilweise(TOOLS, 'die Werkzeuge');
  const dateien = seiten().filter((d) => mitWerkzeugen || !d.startsWith(TOOLS));
  const befunde = await alleMessen(exe, dateien);

  let schlecht = 0, bilder = 0, texte = 0, seitenZahl = 0;
  for (let i = 0; i < dateien.length; i++) {
    const datei = dateien[i], b = befunde[i];
    const kurz = path.relative(MATERIAL, datei).replace(/\\/g, '/');
    if (!b) {
      console.log('  FEHLER ' + kurz + ': keine Messung zurueckbekommen');
      schlecht++;
      continue;
    }
    seitenZahl++;
    const kopf = b.find((x) => x.art === 'geprueft');
    if (kopf) {
      bilder += parseInt(kopf.svg, 10) || 0;
      texte += parseInt(kopf.text, 10) || 0;
    }
    for (const x of b) {
      if (x.art === 'geprueft' || erlaubt(datei, x)) continue;
      schlecht++;
      console.log('  FEHLER ' + kurz + '  ' + x.art + ': ' + x.text
        + (x.zustand && x.zustand !== '-' ? '  (' + x.zustand + ')' : '')
        + (x.was ? '  ->  ' + x.was : ''));
    }
  }
  console.log('\n' + seitenZahl + ' Seiten, ' + bilder + ' Zeichnungen, '
    + texte + ' Texte' + (schlecht ? ' - ' + schlecht + ' Befunde'
      : ' - keine Beschriftung liegt im Weg'));
  return schlecht;
}

lauf().then((schlecht) => process.exit(schlecht ? 1 : 0));
