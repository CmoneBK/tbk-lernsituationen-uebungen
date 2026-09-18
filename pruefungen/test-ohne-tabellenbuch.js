/* Wenn kein Tabellenbuch auf dem Tisch liegt.
 *
 * Nicht jede Lerngruppe hat eines. assets/tabellenbuch.js kennt deshalb drei
 * Zustände - "mit", "ohne" (Aufgaben weglassen) und "auszug" (die
 * gebrauchten Zeilen stehen in der Aufgabe). Diese Prüfung hält zweierlei
 * nach:
 *
 *   1. Die Mechanik. Drei Zustände, drei Ergebnisse; eine h2 meint den
 *      ganzen Abschnitt; der Bildungsgang HS10 schlägt vor, die eigene Wahl
 *      geht vor; und "alle Inhalte zeigen" holt einen Auszug NICHT hervor -
 *      das ist der Punkt, an dem der Schalter sonst wirkungslos wäre.
 *
 *   2. Die Auszeichnung im Material. Ein Wert, den der Baustein nicht kennt,
 *      tut nichts. Ein Auszug in einem <details> wäre erst zu sehen, wenn
 *      die Lösung schon offen steht - der häufigste Fehler beim Setzen.
 *      Und ein Auszug ohne Quellenangabe ist eine abgeschriebene Tabelle.
 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

const { MATERIAL, TOOLS, teilweise } = require('./orte');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was
    + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const QUELLE = fs.readFileSync(
  path.join(MATERIAL, 'assets/tabellenbuch.js'), 'utf8');
const BG = fs.readFileSync(
  path.join(MATERIAL, 'assets/bildungsgang.js'), 'utf8');

const SCHLUSS = '<' + '/script>';
const inline = (js) => '<script>' + js.split(SCHLUSS).join('<\\/script>')
  + SCHLUSS;

/* Eine nackte Seite mit beiden Bausteinen - so wie der Browser sie lädt. */
async function seite(koerper, { tb, bg, meta } = {}) {
  const speicher = {};
  if (bg) speicher['tbk-bildungsgang'] = bg;
  if (tb) speicher['tbk-tabellenbuch'] = tb;
  const dom = new JSDOM(
    '<!doctype html><html><head><title>x</title>'
    + (meta ? '<meta name="tb" content="' + meta + '">' : '')
    + '</head><body><main>' + koerper + '</main>'
    + inline(BG) + inline(QUELLE) + '</body></html>',
    {
      runScripts: 'dangerously', url: 'https://t-bk.de/x/y.html',
      beforeParse(w) {
        Object.defineProperty(w, 'localStorage', {
          value: {
            getItem: (k) => (k in speicher ? speicher[k] : null),
            setItem: (k, v) => { speicher[k] = String(v); },
            removeItem: (k) => { delete speicher[k]; },
          }, configurable: true,
        });
      },
    });
  await fertig(dom);
  return dom.window.document;
}

const KOERPER =
  '<h2 id="a" data-tb="noetig">Nachschlagen</h2>'
  + '<p id="a1">Erster Absatz</p>'
  + '<div class="tb-auszug" data-tb="auszug" id="aus"><table><tr><td>1</td></tr></table></div>'
  + '<h2 id="b">Ohne Buch</h2>'
  + '<p id="b1">Bleibt immer</p>'
  + '<details id="d" data-tb="noetig"><summary>Teilaufgabe</summary></details>';

const weg = (d, id) => d.getElementById(id).hidden;

(async function () {
  console.log('\nDrei Zustände');
  {
    /* Alle drei Zustände gelten nur bei HS10 - deshalb steht der
       Bildungsgang in jedem dieser Fälle dabei. */
    const HS = { bg: 'bfs-hs10' };

    const mit = await seite(KOERPER, { bg: 'bfs-hs10', tb: 'mit' });
    p('mit Buch: alles da außer dem Auszug',
      !weg(mit, 'a') && !weg(mit, 'a1') && !weg(mit, 'd') && weg(mit, 'aus'));
    p('und der Zustand heißt "mit"',
      mit.documentElement.getAttribute('data-tb-zustand') === 'mit');

    const ohne = await seite(KOERPER, Object.assign({ tb: 'ohne' }, HS));
    p('ohne Buch: der Abschnitt fällt weg',
      weg(ohne, 'a') && weg(ohne, 'a1'));
    p('ohne Buch: auch die Teilaufgabe', weg(ohne, 'd'));
    p('ohne Buch: der Auszug bleibt weg', weg(ohne, 'aus'));
    p('ohne Buch: der andere Abschnitt bleibt',
      !weg(ohne, 'b') && !weg(ohne, 'b1'));

    const aus = await seite(KOERPER, Object.assign({ tb: 'auszug' }, HS));
    p('mit Auszügen: der Abschnitt bleibt',
      !weg(aus, 'a') && !weg(aus, 'a1') && !weg(aus, 'd'));
    p('mit Auszügen: der Auszug steht da', !weg(aus, 'aus'));
  }

  console.log('\nDer Abschnitt endet an der nächsten Überschrift');
  {
    const ohne = await seite(KOERPER, { bg: 'bfs-hs10', tb: 'ohne' });
    p('der zweite Abschnitt ist nicht mit verschwunden', !weg(ohne, 'b1'));
  }

  console.log('\nDie Frage stellt sich nur bei HS10');
  {
    const hs = await seite(KOERPER, { bg: 'bfs-hs10' });
    p('HS10 ohne eigene Wahl: ohne Buch',
      hs.documentElement.getAttribute('data-tb-zustand') === 'ohne');

    const hsMit = await seite(KOERPER, { bg: 'bfs-hs10', tb: 'mit' });
    p('eigene Wahl "mit" gilt vor der Voreinstellung',
      hsMit.documentElement.getAttribute('data-tb-zustand') === 'mit'
      && !weg(hsMit, 'a'));

    /* Der Punkt, an dem es sonst schiefginge: Wer den Schalter nicht sieht,
       darf auch nicht von ihm betroffen sein. Sonst fiele die halbe Seite
       weg und niemand fände den Weg zurück. */
    const im = await seite(KOERPER, { bg: 'im', tb: 'ohne' });
    p('ein anderer Bildungsgang: der Schalter wirkt nicht',
      im.documentElement.getAttribute('data-tb-zustand') === 'mit'
      && !weg(im, 'a') && !weg(im, 'd'));

    const keiner = await seite(KOERPER, { tb: 'ohne' });
    p('ohne Bildungsgangwahl ebenso',
      keiner.documentElement.getAttribute('data-tb-zustand') === 'mit');
  }

  console.log('\nEine ganze Seite, die ohne Buch nicht geht');
  {
    const ohne = await seite('<p>nichts ausgezeichnet</p>',
      { bg: 'bfs-hs10', tb: 'ohne', meta: 'noetig' });
    p('bekommt einen Hinweis statt einer leeren Seite',
      !!ohne.getElementById('tb-seite'));
    p('und der sagt, dass auch kein Auszug hilft',
      /kein Auszug/.test((ohne.getElementById('tb-seite') || {}).textContent || ''));
    const mit = await seite('<p>x</p>', { bg: 'bfs-hs10', tb: 'mit', meta: 'noetig' });
    p('mit Buch kein Hinweis', !mit.getElementById('tb-seite'));
    const auszug = await seite(KOERPER,
      { bg: 'bfs-hs10', tb: 'auszug', meta: 'noetig' });
    p('wer Auszüge mitbringt, braucht keinen Hinweis',
      !auszug.getElementById('tb-seite'));
    const andere = await seite('<p>x</p>', { bg: 'im', meta: 'noetig' });
    p('für andere Bildungsgänge gar kein Hinweis',
      !andere.getElementById('tb-seite'));
  }

  /* ---------- Die Auszeichnung im Material ---------- */
  console.log('\nWie die Seiten ausgezeichnet sind');
  {
    const sammeln = (wurzel, teil) => {
      const aus = [];
      const gehen = (ort) => {
        let e;
        try { e = fs.readdirSync(ort, { withFileTypes: true }); }
        catch (x) { return; }
        for (const d of e) {
          const voll = path.join(ort, d.name);
          if (d.isDirectory()) gehen(voll);
          else if (d.name.endsWith('.html')) aus.push(voll);
        }
      };
      gehen(path.join(wurzel, teil));
      return aus;
    };
    const seiten = [
      ...sammeln(MATERIAL, 'uebungen'), ...sammeln(MATERIAL, 'trainings'),
      ...sammeln(MATERIAL, 'lernsituationen'),
    ];
    if (teilweise(TOOLS, 'Werkzeug-Repo')) seiten.push(...sammeln(TOOLS, '.'));

    const ERLAUBT = ['noetig', 'auszug'];
    let schief = [], ohneBaustein = [], imDetails = [], ohneQuelle = [];
    let gezaehlt = 0, auszuege = 0;

    for (const datei of seiten) {
      const rel = path.relative(MATERIAL, datei).split(path.sep).join('/');
      const text = fs.readFileSync(datei, 'utf8');
      const werte = [...text.matchAll(/\sdata-tb="([^"]*)"/g)].map((m) => m[1]);
      const meta = /<meta[^>]+name="tb"[^>]+content="([^"]*)"/.exec(text);
      if (!werte.length && !meta) continue;
      gezaehlt += werte.length;

      for (const w of werte) {
        if (!ERLAUBT.includes(w)) schief.push(rel + ': ' + w);
      }
      if (meta && meta[1] !== 'noetig') schief.push(rel + ': meta ' + meta[1]);
      if (!/<script[^>]+src="[^"]*assets\/tabellenbuch\.js"/.test(text)) {
        ohneBaustein.push(rel);
      }

      /* Ein Auszug in einem <details> stünde hinter der Lösung. */
      const dom = new JSDOM(text);
      for (const a of dom.window.document.querySelectorAll('[data-tb="auszug"]')) {
        auszuege++;
        if (a.closest('details')) imDetails.push(rel);
        if (!a.querySelector('.tb-quelle')) ohneQuelle.push(rel);
      }
      dom.window.close();
    }

    p(gezaehlt + ' Auszeichnungen, davon ' + auszuege + ' Auszüge',
      gezaehlt > 0, String(gezaehlt));
    p('jeder Wert ist einer, den der Baustein kennt', !schief.length,
      schief.join(' | '));
    p('jede ausgezeichnete Seite bindet den Baustein ein',
      !ohneBaustein.length, ohneBaustein.join(' | '));
    p('kein Auszug steckt in einem details',
      !imDetails.length, imDetails.join(' | '));
    p('jeder Auszug sagt, woher er kommt',
      !ohneQuelle.length, ohneQuelle.join(' | '));
  }

  console.log(fehler ? '\n' + fehler + ' Fehler.'
    : '\nDer Schalter wirkt, und die Auszeichnung sitzt.');
  process.exitCode = fehler ? 1 : 0;
}());
