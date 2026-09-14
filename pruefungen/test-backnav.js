/* Der Rücklink: überall derselbe schwebende Knopf, nur die Beschriftung und
   das Ziel wechseln. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(TOOLS, 'Werkzeug-Repo') || !dran(WEBSEITE, 'Webseite')) return;
const MAT = MATERIAL;

const WEB = WEBSEITE;

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const QUELLE = fs.readFileSync(path.join(MAT, 'assets/back-nav.js'), 'utf8');

/* Eine nackte Seite, die den Baustein mit den gewünschten Angaben lädt. */
function seite(attr, url) {
  const dom = new JSDOM(
    '<!doctype html><html><head><title>x</title></head><body><h1>Da</h1>'
    + '<script id="bn" ' + attr + '>' + QUELLE.split('<' + '/script>').join('<\\/script>')
    + '</script></body></html>',
    { runScripts: 'dangerously', url });
  return dom.window.document;
}

console.log('\nBeschriftung und Ziel');
{
  const d = seite('', 'https://t-bk.de/unterrichtsmaterial/uebungen/x.html');
  const a = d.getElementById('tbk-back');
  p('Knopf wird angelegt', !!a);
  p('Vorgabe bleibt "Übersicht"', a.textContent.trim() === 'Übersicht', a.textContent.trim());
  p('Titel passt dazu', a.title === 'Zurück zur Übersicht', a.title);
  p('mit Pfeil-Symbol', !!a.querySelector('svg'));

  const d2 = seite('data-ziel="/" data-text="Startseite"', 'https://t-bk.de/werkzeuge/');
  const a2 = d2.getElementById('tbk-back');
  p('Beschriftung wählbar', !!a2 && a2.textContent.trim() === 'Startseite',
    a2 && a2.textContent.trim());
  p('Titel zieht mit', !!a2 && a2.title === 'Zurück zur Startseite', a2 && a2.title);
  p('Ziel ist die Wurzel', !!a2 && a2.getAttribute('href') === 'https://t-bk.de/',
    a2 && a2.getAttribute('href'));
}

console.log('\nDie Wurzel gibt es nur auf der eigenen Domain');
{
  const auf = (url) => !!seite('data-ziel="/" data-text="Startseite"', url)
    .getElementById('tbk-back');
  p('t-bk.de: da', auf('https://t-bk.de/werkzeuge/'));
  p('GitHub Pages: nicht da', !auf('https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/'));
  p('lokal: nicht da', !auf('file:///K:/tmp/index.html'));

  /* Ein Ziel innerhalb des Bereichs ist überall sinnvoll. */
  const innen = (url) => !!seite('data-ziel="../"', url).getElementById('tbk-back');
  p('Bereichsziel auch auf GitHub Pages', innen('https://cmonebk.github.io/x/tools/a.html'));
  p('Bereichsziel auch lokal', innen('file:///K:/tmp/tools/a.html'));
}

console.log('\nWer den Knopf jetzt trägt');
{
  const hat = (datei, was) => {
    const s = fs.readFileSync(datei, 'utf8');
    return was.every((w) => s.includes(w));
  };
  const ohneAlt = (datei) => !/class="back"/.test(fs.readFileSync(datei, 'utf8'));

  const SEITEN = [
    ['Materialübersicht', path.join(MAT, 'index.html'),
      ['assets/back-nav.js" data-ziel="/" data-text="Startseite"']],
    ['Werkzeugübersicht', path.join(TOOLS, '../index.html'),
      ['tools/assets/back-nav.js" data-ziel="/" data-text="Startseite"']],
    ['Impressum', path.join(WEB, 'public/impressum.html'),
      ['/assets/back-nav.js" data-ziel="/" data-text="Startseite"']],
    ['Datenschutz', path.join(WEB, 'public/datenschutz.html'),
      ['/assets/back-nav.js" data-ziel="/" data-text="Startseite"']],
  ];
  for (const [name, datei, muss] of SEITEN) {
    p(name + ': Baustein eingebunden', hat(datei, muss));
    p(name + ': keine blaue Textzeile mehr', ohneAlt(datei));
  }

  const deploy = fs.readFileSync(path.join(WEB, 'deploy.sh'), 'utf8');
  p('deploy.sh: erzeugte Bereichsseiten tragen ihn',
    deploy.includes('/assets/back-nav.js" data-ziel="/" data-text="Startseite"'));
  p('deploy.sh: keine blaue Textzeile mehr', !/class="back"/.test(deploy));
  p('deploy.sh: Kopf hat Luft', /header\.wrap\{padding-top:62px/.test(deploy));
  p('Baustein liegt im Webseiten-Repo',
    fs.existsSync(path.join(WEB, 'public/assets/back-nav.js')));

  /* Die drei Kopien müssen gleich sein - eine Quelle, drei Ablagen. */
  const gleich = (a, b) => fs.readFileSync(a, 'utf8').replace(/\r\n/g, '\n')
    === fs.readFileSync(b, 'utf8').replace(/\r\n/g, '\n');
  p('Kopie im Werkzeug-Repo ist aktuell',
    gleich(path.join(MAT, 'assets/back-nav.js'), path.join(TOOLS, 'assets/back-nav.js')));
  p('Kopie im Webseiten-Repo ist aktuell',
    gleich(path.join(MAT, 'assets/back-nav.js'), path.join(WEB, 'public/assets/back-nav.js')));
}

console.log('\nPlatz für den Knopf');
{
  /* Der Knopf schwebt oben links. Liegt die Überschrift darunter, deckt er
     ihren ersten Buchstaben zu - das war in den Lektionen so. */
  const LEKTIONEN = ['fertigungstechnik-fuegeverfahren-schweissen.html',
    'fertigungstechnik-fuegeverfahren-ueberblick.html',
    'fertigungstechnik-prueftechnik-einfuehrung.html',
    'maschinenelemente-schrauben-schraubverbindungen.html'];
  for (const f of LEKTIONEN) {
    const s = fs.readFileSync(path.join(TOOLS, f), 'utf8');
    p(f.replace(/^[a-z]+-/, '') + ': Kopf hat Luft',
      /\.wrap\{max-width:1100px; margin:0 auto; padding:56px/.test(s));
  }
  for (const [name, datei, regel] of [
    /* header.wrap, nicht header: Die Klasse .wrap sticht ein blosses
       header aus - die Regel griffe sonst gar nicht. */
    ['Materialübersicht', path.join(MAT, 'index.html'), /header\.wrap\{padding-top:62px/],
    ['Werkzeugübersicht', path.join(TOOLS, '../index.html'), /header\.wrap\{padding-top:62px/],
    ['Impressum', path.join(WEB, 'public/impressum.html'), /\.wrap\{[^}]*padding:62px/],
    ['Datenschutz', path.join(WEB, 'public/datenschutz.html'), /\.wrap\{[^}]*padding:62px/],
  ]) {
    p(name + ': Kopf hat Luft', regel.test(fs.readFileSync(datei, 'utf8')));
  }
}

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exit(fehler ? 1 : 0);
