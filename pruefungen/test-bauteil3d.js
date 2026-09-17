/* Der Baustein für 3D-Darstellungen und sein erster Anwender.
 *
 * Eine Leinwand lässt sich in jsdom nicht zeichnen - WebGL gibt es dort
 * nicht. Geprüft wird deshalb, was sich ohne Bild prüfen lässt, und das ist
 * mehr, als man denkt:
 *
 *   1. Liegt der Baustein in beiden Repos zeichengleich, und ist three.js da?
 *      Nachgeladen wird nichts; fehlt die Datei, bleibt die Seite stumm.
 *   2. Fällt die Seite ohne WebGL sauber zurück? Eine Lernsituation, die
 *      ohne 3D nicht mehr zu bearbeiten ist, wäre falsch gebaut.
 *   3. Stimmt die Geometrie mit dem überein, was die Lernsituation lehrt?
 *      Das ist der eigentliche Punkt: Wer das Modell nachmisst, muss die
 *      Zahlen aus Teil 6 wiederfinden - sonst widerspricht sich die Seite.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { BASIS, mitAssets, fertig } = require('./harness');
const { TOOLS } = require('./orte');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const LS = 'lernsituationen/lagerbock/index.html';

async function main() {
  console.log('\nDer Baustein');

  const hier = path.join(BASIS, 'assets', 'bauteil3d.js');
  const dort = path.join(TOOLS, 'assets', 'bauteil3d.js');
  p('assets/bauteil3d.js liegt im Materialrepo', fs.existsSync(hier));
  p('und im Werkzeugrepo', fs.existsSync(dort));
  if (fs.existsSync(hier) && fs.existsSync(dort)) {
    p('beide sind zeichengleich',
      fs.readFileSync(hier, 'utf8') === fs.readFileSync(dort, 'utf8'));
  }

  /* three.js kommt aus dem Repo, nicht aus dem Netz. Das ist keine
     Geschmacksfrage: Ein Werkzeug, das beim Aufruf einen fremden Server
     fragt, verrät, wer es benutzt. */
  ['vendor/three.min.js', 'vendor/OrbitControls.js'].forEach((f) => {
    p(f + ' liegt im Repo', fs.existsSync(path.join(BASIS, f)));
  });

  const quelle = fs.readFileSync(hier, 'utf8');
  p('der Baustein lädt selbst nichts nach',
    !/\bfetch\s*\(|XMLHttpRequest|import\s*\(/.test(quelle));
  p('er räumt hinter sich auf (dispose)',
    /renderer\.dispose\(\)/.test(quelle) && /geometry\.dispose\(\)/.test(quelle));

  /* Ohne WebGL darf nichts krachen - moeglich() muss das sagen können,
     ohne dass THREE überhaupt geladen ist. */
  {
    const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only' });
    dom.window.eval(quelle);
    p('ohne THREE meldet moeglich() false',
      dom.window.Bauteil3D && dom.window.Bauteil3D.moeglich() === false);
    p('und aufbauen() gibt null zurück',
      dom.window.Bauteil3D.aufbauen(null, {}) === null);
  }

  console.log('\nDie Lernsituation ohne 3D');

  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push(String((e.detail && e.detail.message) || e.message)));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, LS), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + LS,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  await fertig(dom);
  const w = dom.window, d = w.document;

  p('die Seite lädt ohne Fehler', !laut.length, laut[0]);
  p('der Hinweis ohne 3D steht da', !d.getElementById('ohne3d').hidden);
  p('die Montagekarte bleibt verborgen', d.getElementById('karte3d').hidden);
  p('die Stellenkarte bleibt verborgen', d.getElementById('karteStellen').hidden);
  p('Teil 2 lässt sich trotzdem bearbeiten',
    d.querySelectorAll('#tabNaehte tr').length === 5,
    d.querySelectorAll('#tabNaehte tr').length + ' Zeilen');

  console.log('\nDie Geometrie gegen die Lernsituation');

  const M = w.M;
  const teile = w.teileListe();
  const marken = w.markenListe();

  p('sechs Teile', teile.length === 6, teile.length + '');
  p('jede Nahtangabe hat eine Marke',
    w.NAEHTE.every((n) => marken.some((m) => m.id === n.id)),
    w.NAEHTE.map((n) => n.id).join(''));

  /* Es muss mehr anzuklicken geben als Lösungen: An jeder Kehle KÖNNTE
     geschweißt werden, und die Aufgabe ist gerade, die richtige zu finden.
     Gäbe es nur fünf Stellen, wäre die fünfte durch Ausschluss zu haben. */
  const loesung = marken.filter((m) => w.istNaht(m.id));
  const ablenkung = marken.filter((m) => !w.istNaht(m.id));
  p('es gibt Kanten ohne Schweißangabe', ablenkung.length > 0,
    ablenkung.length + ' von ' + marken.length);
  p('und mehr anklickbare Stellen als Angaben',
    new Set(marken.map((m) => m.id)).size > w.NAEHTE.length,
    new Set(marken.map((m) => m.id)).size + ' zu ' + w.NAEHTE.length);

  /* Am Anschlag liegen mehrere Kehlen nebeneinander - dort entscheidet
     sich, ob jemand die Angabe gelesen hat oder geraten. */
  const amAnschlag = marken.filter((m) => {
    if (!m.von) return false;
    /* Am Anschlag heisst: im Fussabdruck des Anschlags. Die Spitze der
       rechten Rippe liegt zufaellig auf derselben Hoehe in x - sie steht
       aber in der Blechebene, weit hinter dem Anschlag. */
    const x = Math.min(m.von.x, m.bis.x);
    const z = (m.von.z + m.bis.z) / 2;
    return x > M.platteL / 2 - M.anschlagX - 4
      && Math.abs(z - M.anschlagZM) <= M.anschlagZ / 2 + 4;
  });
  p('am Anschlag sind mehrere Stellen zu unterscheiden',
    amAnschlag.length >= 3, amAnschlag.length + ' Stellen');
  p('und nur eine davon ist die Naht',
    amAnschlag.filter((m) => w.istNaht(m.id)).length === 1,
    amAnschlag.map((m) => m.id).join(', '));

  /* Angeklickt werden Kanten, keine Kugeln: Wer auf eine Naht zeigen soll,
     soll auf die Naht zeigen koennen. */
  p('jede Stelle ist eine Kante oder eine Rundnaht',
    marken.every((m) => m.von || m.ring), 'Kugeln dabei');

  /* Die Nahtlängen aus Teil 6 werden nicht hier hineingeschrieben, sondern
     aus der Seite gelesen: Geprüft wird, dass sie aus der Geometrie folgen.
     Wer eines von beiden ändert, muss das andere mitändern - sonst fällt es
     hier auf und nicht erst im Unterricht. */
  const roh0 = fs.readFileSync(path.join(BASIS, LS), 'utf8');
  const lies = (was) => {
    const m = new RegExp('Nähte mit a = ' + was
      + '</span><span class="v">(\\d+) mm').exec(roh0);
    return m ? Number(m[1]) : null;
  };
  const langA4 = lies('4'), langA3 = lies('3');
  p('Teil 6 nennt eine Länge für a = 4', langA4 !== null, String(langA4));
  p('Teil 6 nennt eine Länge für a = 3', langA3 !== null, String(langA3));

  /* Naht A: Doppel-Kehlnaht - beide Seiten über die Breite des Stehblechs. */
  p('Naht A folgt aus der Blechbreite: 2 × ' + M.blechB + ' = ' + langA4,
    2 * M.blechB === langA4, '2 × ' + M.blechB + ' ≠ ' + langA4);
  p('das Stehblech überragt die Grundplatte nicht',
    M.blechB <= M.platteL, M.blechB + ' auf ' + M.platteL);

  /* Naht C läuft umlaufend um die Rippe, also beidseitig entlang der beiden
     Katheten. Dazu die unterbrochene Naht D mit 3 × 30 mm. */
  const langC = 2 * (M.rippeX + M.rippeY), langD = 90;
  p('Naht C und D ergeben zusammen die ' + langA3 + ' mm aus Teil 6',
    langC + langD === langA3,
    '2 × (' + M.rippeX + ' + ' + M.rippeY + ') + ' + langD + ' = '
    + (langC + langD) + ' ≠ ' + langA3);

  /* Und die Rechnung darunter muss dieselben Längen verwenden. */
  p('die Rechnung arbeitet mit denselben Metern',
    Math.abs(w.L_A4 - langA4 / 1000) < 1e-9
    && Math.abs(w.L_A3 - langA3 / 1000) < 1e-9,
    w.L_A4 + ' / ' + w.L_A3);

  /* Und die Rippe muss auch draufpassen: neben dem Blech ist auf jeder
     Seite nur (Plattenlänge - Blechbreite) / 2 Platz, und davon geht noch
     der Anschlag ab. */
  p('die Rippe bleibt auf der Grundplatte',
    M.rippeX + M.anschlagX <= (M.platteL - M.blechB) / 2,
    M.rippeX + ' + ' + M.anschlagX + ' mm, Platz ist '
    + (M.platteL - M.blechB) / 2);
  p('die Rippe bleibt unter der Blechkante',
    M.rippeY < M.blechH, M.rippeY + ' von ' + M.blechH);

  /* Die Bohrung: Der Stutzen muss hindurchpassen und das Blech muss sie
     tragen können. */
  const blech = teile.filter((x) => x.id === 'blech')[0];
  p('das Stehblech hat die Bohrung für den Stutzen',
    !!(blech.masse.loch && blech.masse.loch.d === M.rohrD),
    blech.masse.loch ? String(blech.masse.loch.d) : 'keine Bohrung');
  p('rund um die Bohrung bleibt Blech stehen',
    M.rohrY + M.rohrD / 2 < M.platteD + M.blechH
    && M.rohrD < M.blechB,
    'Oberkante ' + (M.rohrY + M.rohrD / 2) + ' von '
    + (M.platteD + M.blechH));

  /* Der Stutzen sitzt in der Bohrung und ragt beidseitig heraus. */
  p('der Rohrstutzen durchdringt das Stehblech',
    M.rohrL > M.blechD, M.rohrL + ' zu ' + M.blechD);

  /* Jede Kante muss am Bauteil liegen, nicht daneben in der Luft. Die
     Raupe steht ein Stueck aus der Kehle heraus, deshalb die Zugabe. */
  const luft = 8;
  const punkte = (m) => m.ring ? [m.ring.mitte] : [m.von, m.bis];
  const daneben = marken.filter((m) => punkte(m).some((e) =>
    Math.abs(e.x) > M.platteL / 2 + luft
    || Math.abs(e.z) > M.platteT / 2 + luft
    || e.y < M.platteD - luft || e.y > M.platteD + M.blechH + luft));
  p('jede Stelle liegt am Bauteil', !daneben.length,
    daneben.map((m) => m.id).join(', '));

  /* Eine Kante ohne Laenge waere nicht zu treffen - und die Rechnung, die
     den Zylinder auf die Strecke legt, wuerde durch null teilen. */
  const entartet = marken.filter((m) => m.von
    && Math.hypot(m.bis.x - m.von.x, m.bis.y - m.von.y, m.bis.z - m.von.z) < 3);
  p('keine Kante ohne Länge', !entartet.length,
    entartet.map((m) => m.id).join(', '));

  /* Zwei Kanten verschiedener Antworten duerfen nicht aufeinanderliegen:
     Dann waere nicht zu entscheiden, welche getroffen wurde. */
  const mitte = (m) => m.ring ? m.ring.mitte : {
    x: (m.von.x + m.bis.x) / 2, y: (m.von.y + m.bis.y) / 2,
    z: (m.von.z + m.bis.z) / 2 };
  const zuNah = [];
  for (let i = 0; i < marken.length; i++) {
    for (let j = i + 1; j < marken.length; j++) {
      if (marken[i].id === marken[j].id) continue;
      const a = mitte(marken[i]), b = mitte(marken[j]);
      const d2 = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (d2 < 8) {
        zuNah.push(marken[i].id + '/' + marken[j].id + ': ' + Math.round(d2));
      }
    }
  }
  p('keine zwei Antworten liegen aufeinander', !zuNah.length, zuNah.join(', '));

  /* Die Zeichnung fuehrt ihre Maße als eigene Konstanten - sie entsteht in
     einem Skriptblock, der vor der Liste M läuft und deshalb nicht auf sie
     zugreifen kann. Damit die beiden nicht auseinanderlaufen, werden sie
     hier gegeneinander gehalten. Genau das ist schon passiert: Im Modell
     war der Anschlag 8 mm dick, in der Zeichnung stand 6. */
  const zeichnung = {};
  const block = /var PL = [\s\S]*?var AX = [^;]*;/.exec(roh0);
  if (block) {
    const re = /\b([A-Z]{2,4}) = (\d+(?:\.\d+)?)/g;
    let treffer;
    while ((treffer = re.exec(block[0])) !== null) {
      zeichnung[treffer[1]] = Number(treffer[2]);
    }
  }
  p('die Zeichnung führt ihre Maße als Konstanten',
    Object.keys(zeichnung).length >= 14,
    Object.keys(zeichnung).length + ' gefunden');

  const gleich = [
    ['PL', 'platteL'], ['PT', 'platteT'], ['PD', 'platteD'],
    ['BB', 'blechB'], ['BH', 'blechH'], ['BD', 'blechD'],
    ['RD', 'rohrD'], ['RDI', 'rohrDi'], ['RL', 'rohrL'], ['RY', 'rohrY'],
    ['KX', 'rippeX'], ['KY', 'rippeY'], ['KD', 'rippeD'],
    ['AX', 'anschlagX'], ['AY', 'anschlagY'], ['AZ', 'anschlagZ'],
    ['AZM', 'anschlagZM'],
  ];
  const drift = gleich.filter(([z, m]) => zeichnung[z] !== M[m])
    .map(([z, m]) => z + ' = ' + zeichnung[z] + ' gegen ' + m + ' = ' + M[m]);
  p('Zeichnung und Modell nennen dieselben Maße', !drift.length,
    drift.join(' · '));

  /* Die Teileliste der Seite und die Maße müssen dasselbe sagen. */
  const roh = fs.readFileSync(path.join(BASIS, LS), 'utf8');
  [['Grundplatte', M.platteL + ' × ' + M.platteT + ' × ' + M.platteD],
   ['Stehblech', M.blechB + ' × ' + M.blechH + ' × ' + M.blechD]
  ].forEach(([name, mass]) => {
    const such = mass.split(' × ').join(' &times; ');
    p('die Teileliste nennt ' + name + ' mit ' + mass,
      roh.indexOf(such) >= 0, such);
  });

  w.close();
  console.log('\n' + (fehler ? fehler + ' Befunde' : 'alles gruen'));
  process.exit(fehler ? 1 : 0);
}

main();
