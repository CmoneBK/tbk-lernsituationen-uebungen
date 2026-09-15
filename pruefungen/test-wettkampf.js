/* Der Wettkampf: derselbe Code, dieselben Aufgaben - und sonst nichts.
 *
 * Der Baustein verspricht dreierlei, und alle drei sind hier nachzuweisen:
 *   1. Wer denselben Code hat, würfelt dieselbe Reihenfolge. Das ist der
 *      ganze Mehrspielermodus; stimmt es nicht, ist der Wettkampf keiner.
 *   2. Er kommt ohne Anmeldung und ohne Übertragung aus - kein Speicher,
 *      kein Netz, keine fremde Adresse.
 *   3. Er räumt hinter sich auf: Math.random gehört der Seite, nicht dem
 *      Baustein. Nach "Beenden" muss es wieder das echte sein.
 *
 * Dazu die Verdrahtung: Jede Seite, die den Vertrag ausspricht, muss den
 * Baustein auch laden - und umgekehrt.
 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { BASIS, mitAssets } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const QUELLE = fs.readFileSync(path.join(BASIS, 'assets/wettkampf.js'), 'utf8');

/* Ein Training im Kleinformat: Es sagt den Vertrag zu und schreibt bei jedem
   neuen Durchgang sechs Würfe mit. Mehr braucht es nicht, um zu sehen, ob
   zwei Geräte dieselbe Reihenfolge bekommen. */
function seite(o) {
  o = o || {};
  const vertrag = 'window.TBK_WETTKAMPF={neu:function(){'
    + 'window.__folge=[];'
    + 'for(var i=0;i<6;i++)window.__folge.push(Math.random());'
    + '}' + (o.ohneRunden ? '' : ',runden:3') + '};';
  const html = '<!doctype html><html><head><title>Training</title></head><body>'
    + '<main><div class="box">Aufgabe</div></main>'
    + (o.ohneVertrag ? '' : '<script>' + vertrag + '</script>')
    + (o.mitQr ? '<script src="../../assets/qr.js"></script>' : '')
    + '<script src="../../assets/wettkampf.js"></script>'
    + '</body></html>';
  const dom = new JSDOM(mitAssets(html), {
    runScripts: 'dangerously',
    url: 'https://t-bk.de/unterrichtsmaterial/trainings/x/y.html' + (o.hash || ''),
    beforeParse(w) {
      w.__echt = w.Math.random;
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  return dom.window;
}

/* Die Tafel baut sich erst beim Öffnen auf. */
function tafelAuf(w) {
  w.document.getElementById('wk-knopf').click();
  return w.document.getElementById('wk-tafel');
}

function knopfMit(tafel, text) {
  return [...tafel.querySelectorAll('button')]
    .filter((b) => b.textContent.trim() === text)[0];
}

/* Einen Durchgang mit einem eingetippten Code beginnen. */
function mitmachen(w, eingabe) {
  const t = tafelAuf(w);
  t.querySelector('#wk-eingabe').value = eingabe;
  knopfMit(t, 'Mitmachen').click();
  return w.__folge;
}

console.log('\nKnopf und Tafel');
{
  const w = seite();
  const d = w.document;
  const knopf = d.getElementById('wk-knopf');
  const tafel = d.getElementById('wk-tafel');
  p('Knopf wird angelegt', !!knopf);
  p('Knopf steht in derselben Leiste wie die anderen',
    !!knopf && knopf.parentNode && knopf.parentNode.id === 'tbk-leiste');
  p('Knopf sagt, dass er etwas aufklappt',
    !!knopf && knopf.getAttribute('aria-expanded') === 'false');
  p('Tafel ist zuerst zu', !!tafel && tafel.hidden);

  const t = tafelAuf(w);
  p('nach dem Klick ist die Tafel offen', !t.hidden);
  p('Knopf meldet das weiter', knopf.getAttribute('aria-expanded') === 'true');
  p('es gibt einen Startknopf', !!knopfMit(t, 'Wettkampf starten'));
  p('und ein Feld zum Mitmachen', !!t.querySelector('#wk-eingabe'));
  p('das Feld hat eine Beschriftung', !!t.querySelector('label[for="wk-eingabe"]'));

  knopf.click();
  p('noch ein Klick schliesst wieder', t.hidden);
}

console.log('\nOhne Zusage der Seite kein Knopf');
{
  const w = seite({ ohneVertrag: true });
  p('kein Knopf', !w.document.getElementById('wk-knopf'));
  p('keine Tafel', !w.document.getElementById('wk-tafel'));
  p('Math.random bleibt unangetastet', w.Math.random === w.__echt);
}

console.log('\nDerselbe Code, dieselbe Reihenfolge');
{
  const a = mitmachen(seite(), 'K7M2Q');
  const b = mitmachen(seite(), 'K7M2Q');
  const c = mitmachen(seite(), 'P4T8W');
  p('sechs Wuerfe sind angekommen', Array.isArray(a) && a.length === 6,
    JSON.stringify(a));
  p('gleicher Code, gleiche Folge', JSON.stringify(a) === JSON.stringify(b),
    JSON.stringify(a) + ' gegen ' + JSON.stringify(b));
  p('anderer Code, andere Folge', JSON.stringify(a) !== JSON.stringify(c));
  /* Ein Wuerfel, der immer dasselbe liefert, waere auch "gleich". */
  p('die Folge ist keine Wiederholung', new Set(a).size === 6);
  p('alle Werte liegen zwischen 0 und 1',
    a.every((z) => typeof z === 'number' && z >= 0 && z < 1));

  /* Ein selbst vergebener Code muss genauso wirken wie ein eingetippter. */
  const w = seite();
  const t = tafelAuf(w);
  knopfMit(t, 'Wettkampf starten').click();
  const eigen = w.document.querySelector('#wk-tafel .wk-code');
  p('der gewuerfelte Code steht auf der Tafel', !!eigen && eigen.textContent.length === 5,
    eigen && eigen.textContent);
  p('er benutzt nur unverwechselbare Zeichen',
    !!eigen && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/.test(eigen.textContent),
    eigen && eigen.textContent);
  const nach = mitmachen(seite(), eigen.textContent);
  p('derselbe Code auf einem zweiten Geraet ergibt dieselbe Folge',
    JSON.stringify(nach) === JSON.stringify(w.__folge));
}

console.log('\nDen Code abtippen verzeiht');
{
  const gerade = mitmachen(seite(), 'K7M2Q');
  p('klein geschrieben', JSON.stringify(mitmachen(seite(), 'k7m2q')) === JSON.stringify(gerade));
  p('mit Bindestrich', JSON.stringify(mitmachen(seite(), 'K7-M2Q')) === JSON.stringify(gerade));
  p('mit Leerzeichen', JSON.stringify(mitmachen(seite(), ' K7 M2Q ')) === JSON.stringify(gerade));

  const w = seite();
  const t = tafelAuf(w);
  t.querySelector('#wk-eingabe').value = 'K7M';
  knopfMit(t, 'Mitmachen').click();
  p('zu kurz: nichts beginnt', w.__folge === undefined);
  p('zu kurz: die Tafel sagt es',
    /fünf Zeichen/.test(t.textContent), t.textContent.slice(-60));
}

console.log('\nDer Durchgang mit Runden');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  const d = w.document;
  p('Streifen steht im Inhalt', !!d.getElementById('wk-streifen'));
  p('Streifen nennt den Code', /K7M2Q/.test(d.getElementById('wk-streifen').textContent));
  p('Streifen nennt die Runde',
    /Runde 1 von 3/.test(d.getElementById('wk-streifen').textContent),
    d.getElementById('wk-streifen').textContent);
  p('Streifen wird nicht mitgedruckt',
    d.getElementById('wk-streifen').getAttribute('data-druck') === 'weg');

  const melden = (ok) => d.dispatchEvent(
    new w.CustomEvent('tbk-runde', { detail: { richtig: ok } }));
  melden(true);
  p('nach einer Runde steht Runde 2',
    /Runde 2 von 3/.test(d.getElementById('wk-streifen').textContent),
    d.getElementById('wk-streifen').textContent);
  melden(false);
  melden(true);

  const erg = d.getElementById('wk-ergebnis');
  p('nach der letzten Runde steht das Ergebnis', !!erg);
  p('es zaehlt richtig mit', !!erg && /2 von 3 richtig/.test(erg.textContent),
    erg && erg.textContent.slice(0, 70));
  p('es nennt eine Zeit', !!erg && /in \d+:\d\d/.test(erg.textContent));
  p('es nennt den Code', !!erg && /K7M2Q/.test(erg.textContent));
  p('der Streifen ist weg', !d.getElementById('wk-streifen'));
  p('Ergebnis wird nicht mitgedruckt',
    !!erg && erg.getAttribute('data-druck') === 'weg');

  /* Nach dem Ende darf keine weitere Meldung mehr zaehlen. */
  melden(true);
  p('spaetere Meldungen zaehlen nicht mehr',
    /2 von 3 richtig/.test(d.getElementById('wk-ergebnis').textContent));
}

console.log('\nWo die Seite ihren Durchgang selbst kennt');
{
  const w = seite({ ohneRunden: true });
  mitmachen(w, 'K7M2Q');
  const d = w.document;
  p('der Durchgang beginnt trotzdem', Array.isArray(w.__folge));
  p('kein zweiter Streifen', !d.getElementById('wk-streifen'));
  d.dispatchEvent(new w.CustomEvent('tbk-runde', { detail: { richtig: true } }));
  p('kein zweites Ergebnis', !d.getElementById('wk-ergebnis'));
  p('der Code steht trotzdem auf der Tafel',
    !!d.querySelector('#wk-tafel .wk-code'));
}

console.log('\nAufraeumen');
{
  const w = seite();
  mitmachen(w, 'K7M2Q');
  p('waehrend des Wettkampfs wuerfelt der Baustein', w.Math.random !== w.__echt);
  p('der Knopf zeigt den Code', /K7M2Q/.test(w.document.getElementById('wk-knopf').textContent));
  knopfMit(w.document.getElementById('wk-tafel'), 'Beenden').click();
  p('danach wuerfelt wieder die Seite', w.Math.random === w.__echt);
  p('der Streifen ist weg', !w.document.getElementById('wk-streifen'));
  p('der Knopf heisst wieder Wettkampf',
    /Wettkampf/.test(w.document.getElementById('wk-knopf').textContent)
    && !/K7M2Q/.test(w.document.getElementById('wk-knopf').textContent));
  p('der Code steht nicht mehr in der Adresse', !/w=/.test(w.location.hash));
}

console.log('\nMitmachen ueber die Adresse');
{
  const w = seite({ hash: '#w=K7M2Q', mitQr: true });
  p('der Durchgang beginnt von allein', Array.isArray(w.__folge));
  p('und zwar mit derselben Folge wie eingetippt',
    JSON.stringify(w.__folge) === JSON.stringify(mitmachen(seite(), 'K7M2Q')));
  const t = tafelAuf(w);
  p('die Tafel zeigt den Code',
    !!t.querySelector('.wk-code') && t.querySelector('.wk-code').textContent === 'K7M2Q');
  const qr = t.querySelector('svg.wk-qr');
  p('ein QR-Code steht daneben', !!qr);
  p('der QR-Code ist beschriftet',
    !!qr && /QR/.test(qr.getAttribute('aria-label') || ''));
  p('er zeichnet auch etwas', !!qr && !!qr.querySelector('path')
    && qr.querySelector('path').getAttribute('d').length > 100);

  /* Fehlt der QR-Baustein, darf nichts kaputtgehen - nur der Code fehlt dann. */
  const ohne = seite({ hash: '#w=K7M2Q' });
  p('ohne QR-Baustein laeuft es weiter', Array.isArray(ohne.__folge));
  p('und dann eben ohne Bild', !ohne.document.querySelector('svg.wk-qr'));
}

console.log('\nKeine Anmeldung, keine Uebertragung');
{
  const code = QUELLE.replace(/\/\*[\s\S]*?\*\//g, '');
  p('kein localStorage', !/localStorage/.test(code));
  p('kein sessionStorage', !/sessionStorage/.test(code));
  p('kein Cookie', !/document\.cookie/.test(code));
  p('kein fetch', !/\bfetch\s*\(/.test(code));
  p('kein XMLHttpRequest', !/XMLHttpRequest/.test(code));
  p('kein WebSocket', !/WebSocket|RTCPeerConnection|EventSource/.test(code));
  p('kein sendBeacon', !/sendBeacon/.test(code));
  /* Der Namensraum der SVG ist eine Kennung, keine Adresse - sonst darf
     nichts nach draussen zeigen. */
  const fremd = (QUELLE.match(/https?:\/\/[^\s'"]+/g) || [])
    .filter((a) => a !== 'http://www.w3.org/2000/svg');
  p('keine fremde Adresse', fremd.length === 0, fremd.join(' '));
  p('der Code verlaesst das Geraet nur als Bild und als Adresse im eigenen Fenster',
    !/location\s*=|location\.href\s*=|\.submit\s*\(/.test(code));
}

console.log('\nVerdrahtung');
{
  const sammeln = (ordner) => {
    const aus = [];
    if (!fs.existsSync(ordner)) return aus;
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const pf = path.join(ordner, e.name);
      if (e.isDirectory()) aus.push(...sammeln(pf));
      else if (/\.html$/.test(e.name)) aus.push(pf);
    }
    return aus;
  };
  const seiten = sammeln(path.join(BASIS, 'trainings'))
    .map((f) => ({ f, t: fs.readFileSync(f, 'utf8') }));

  const mitVertrag = seiten.filter((s) => /TBK_WETTKAMPF\s*=/.test(s.t));
  p(mitVertrag.length + ' Trainings machen mit', mitVertrag.length >= 7,
    String(mitVertrag.length));

  const ohneBaustein = mitVertrag.filter(
    (s) => !/<script src="[^"]*assets\/wettkampf\.js"><\/script>/.test(s.t));
  p('jedes davon laedt den Baustein', ohneBaustein.length === 0,
    ohneBaustein.map((s) => path.relative(BASIS, s.f)).join(', '));

  const ohneVertrag = seiten.filter(
    (s) => /assets\/wettkampf\.js"><\/script>/.test(s.t) && !/TBK_WETTKAMPF\s*=/.test(s.t));
  p('und keine Seite laedt ihn umsonst', ohneVertrag.length === 0,
    ohneVertrag.map((s) => path.relative(BASIS, s.f)).join(', '));

  /* Wer dem Baustein die Runden ueberlaesst, muss sie auch melden. */
  const stumm = mitVertrag.filter((s) => /runden\s*:\s*\d/.test(s.t)
    && !/['"]tbk-runde['"]/.test(s.t));
  p('wer Runden zusagt, meldet sie auch', stumm.length === 0,
    stumm.map((s) => path.relative(BASIS, s.f)).join(', '));

  /* Und wer sie nicht meldet, darf sie auch nicht zusagen - sonst bliebe
     der Streifen auf Runde 1 stehen. */
  const versprochen = mitVertrag.filter((s) => !/runden\s*:\s*\d/.test(s.t)
    && /['"]tbk-runde['"]/.test(s.t));
  p('wer keine Runden zusagt, meldet auch keine', versprochen.length === 0,
    versprochen.map((s) => path.relative(BASIS, s.f)).join(', '));

  p('der Vertrag nennt immer eine Funktion',
    mitVertrag.every((s) => /neu\s*:\s*(function|[A-Za-z_$])/.test(s.t)));
}

console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
process.exit(fehler ? 1 : 0);
