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
  p('und keine Marke steht für sich allein',
    marken.every((m) => w.NAEHTE.some((n) => n.id === m.id)));

  /* Naht A: Doppel-Kehlnaht, "zweimal 180 mm". Beide Seiten des Stehblechs
     über seine ganze Länge - das geht nur auf, wenn das Blech so lang ist
     wie die Platte. */
  p('Naht A: 2 × Stehblechlänge ergibt die 360 mm aus Teil 6',
    2 * M.blechB === 360, '2 × ' + M.blechB);
  p('das Stehblech überragt die Grundplatte nicht',
    M.blechB <= M.platteL, M.blechB + ' auf ' + M.platteL);

  /* Naht C: umlaufend um die Rippe, 250 mm. Umlaufend heißt beidseitig
     entlang der beiden Katheten. */
  p('Naht C: 2 × (Kathete + Kathete) ergibt die 250 mm aus Teil 6',
    2 * (M.rippeX + M.rippeY) === 250,
    '2 × (' + M.rippeX + ' + ' + M.rippeY + ')');

  /* Und die Rippe muss auch draufpassen. */
  p('die Rippe bleibt auf der Grundplatte',
    M.rippeX <= (M.platteT - M.blechD) / 2,
    M.rippeX + ' mm vor dem Blech, Platz ist ' + (M.platteT - M.blechD) / 2);
  p('die Rippe bleibt unter der Blechkante',
    M.rippeY < M.blechH, M.rippeY + ' von ' + M.blechH);

  /* Der Stutzen sitzt im Blech und ragt beidseitig heraus. */
  p('der Rohrstutzen durchdringt das Stehblech',
    M.rohrL > M.blechD, M.rohrL + ' zu ' + M.blechD);
  p('der Stutzen liegt ganz im Blech',
    M.platteD + 55 + M.rohrD / 2 <= M.platteD + M.blechH,
    'Oberkante ' + (M.platteD + 55 + M.rohrD / 2));

  /* Jede Marke muss am Bauteil liegen, nicht daneben in der Luft. */
  const daneben = marken.filter((m) => {
    const x = Math.abs(m.lage.x), y = m.lage.y, z = Math.abs(m.lage.z);
    return x > M.platteL / 2 || z > M.platteT / 2
      || y < M.platteD || y > M.platteD + M.blechH;
  });
  p('jede Marke liegt über der Grundplatte', !daneben.length,
    daneben.map((m) => m.id).join(', '));

  /* Zwei Marken, die aufeinanderliegen, wären nicht zu unterscheiden. */
  const zuNah = [];
  for (let i = 0; i < marken.length; i++) {
    for (let j = i + 1; j < marken.length; j++) {
      const a = marken[i].lage, b = marken[j].lage;
      const d2 = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (d2 < 25) zuNah.push(marken[i].id + '/' + marken[j].id + ': ' + Math.round(d2));
    }
  }
  p('keine zwei Marken liegen aufeinander', !zuNah.length, zuNah.join(', '));

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
