/* Das neue Material zum Überblick über die Fügeverfahren. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
const MAT = MATERIAL;

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const SCHLUSS = '<' + '/script>';

function inline(html) {
  return html.replace(
    /<script src="(?:\.\.\/)+(assets\/[a-z-]+\.js)"[^>]*><\/script>/g,
    (ganz, datei) => {
      if (/thema\.js/.test(datei)) return '';
      const quelle = fs.readFileSync(path.join(MAT, datei), 'utf8')
        .split(SCHLUSS).join('<\\' + '/script>');
      return '<script>' + quelle + SCHLUSS;
    });
}

function fertig(dom) {
  return new Promise((los) => {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', () => los());
    setTimeout(los, 2500);
  });
}

async function laden(rel, suche) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(inline(fs.readFileSync(path.join(MAT, rel), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    url: 'https://t-bk.de/unterrichtsmaterial/' + rel + (suche || ''),
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  await fertig(dom);
  return { dom, d: dom.window.document, w: dom.window, laut };
}

/* Was jede Seite des Materials können muss - unabhängig vom Inhalt. */
async function grundlagen(rel, teileMin) {
  const kurz = rel.split('/').pop();
  const geladen = await laden(rel);
  const { d, laut } = geladen;
  p(kurz + ': lädt ohne Fehler', !laut.length, laut.join(' | '));
  p(kurz + ': hat main', !!d.querySelector('main'));
  p(kurz + ': Teile gegliedert',
    d.querySelectorAll('main h2').length >= teileMin,
    d.querySelectorAll('main h2').length + ' h2');
  p(kurz + ': Baukasten baut sich auf', !!d.getElementById('bk-knopf'));
  p(kurz + ': Herunterladen baut sich auf', !!d.getElementById('ex-knopf'));
  p(kurz + ': Bildungsgang wählbar', !!d.querySelector('#bk-bildungsgang select'));
  p(kurz + ': Rücklink zur Paketseite', !!d.getElementById('tbk-back'));
  const nr = [...d.querySelectorAll('main h2 .nr')].map((e) => e.textContent);
  p(kurz + ': Teile durchnummeriert',
    nr.join(',') === nr.map((_, i) => String(i + 1)).join(','), nr.join(','));
  return geladen;
}

async function main() {

console.log('\nÜbung 1 – Wo geht die Kraft über?');
{
  const rel = 'uebungen/fuegeverfahren/01-wo-geht-die-kraft-ueber.html';
  const { d } = await grundlagen(rel, 4);
  p('vier Verbindungen', d.querySelectorAll('.fall').length === 4);
  p('jede mit Zeichnung', d.querySelectorAll('.fall svg').length === 4);
  const teile = [...d.querySelectorAll('.fall svg')]
    .map((s) => s.querySelectorAll('rect,path,line,text').length);
  p('Zeichnungen haben Inhalt', teile.every((n) => n > 5), teile.join(', '));
  p('eigene Schraffurmuster je Bild',
    new Set([...d.querySelectorAll('.fall svg pattern')].map((e) => e.id)).size
      === d.querySelectorAll('.fall svg pattern').length,
    [...d.querySelectorAll('.fall svg pattern')].map((e) => e.id).join(', '));
  p('Auswahlfelder werden zu Kästchen',
    d.querySelectorAll('.fall select[data-druck="ankreuzen"]').length === 4);
  p('Lösung getrennt vom Fall',
    d.querySelectorAll('#loesungen p').length === 4);
}

console.log('\nÜbung 2 – Welches Verfahren passt?');
{
  const rel = 'uebungen/fuegeverfahren/02-welches-verfahren-passt.html';
  const { d } = await grundlagen(rel, 3);
  p('vier Aufträge', d.querySelectorAll('.auftragskarte').length === 4);
  p('je zwei Auswahlfelder',
    d.querySelectorAll('.auftragskarte select').length === 8);
  p('alle als Ankreuzfeld',
    d.querySelectorAll('.auftragskarte select[data-druck="ankreuzen"]').length === 8);
  p('acht Kriterien in der Tabelle',
    d.querySelectorAll('#kriterien tr').length === 8);
  p('Lösung je Auftrag', d.querySelectorAll('#loesungen div').length === 4);
  p('16 Verfahren zur Wahl',
    d.querySelector('#v0').options.length === 17,
    d.querySelector('#v0').options.length - 1 + '');
}

console.log('\nÜbung 3 – Die Verbindung hält nicht');
{
  const rel = 'uebungen/fuegeverfahren/03-die-verbindung-haelt-nicht.html';
  const { d } = await grundlagen(rel, 3);
  p('vier Schadensfälle', d.querySelectorAll('.schaden').length === 4);
  p('jeder mit Zeichnung', d.querySelectorAll('.schaden svg').length === 4);
  p('je vier Erklärungen zur Wahl',
    [...d.querySelectorAll('.schaden select')].every((s) => s.options.length === 5),
    [...d.querySelectorAll('.schaden select')].map((s) => s.options.length - 1).join(', '));
  p('Lösung je Fall', d.querySelectorAll('#loesungen div').length === 4);
  p('Fehlgriff-Tabelle steht', d.querySelectorAll('table tbody tr').length === 4);
}

console.log('\nÜbung 4 – Lösen, aber wie?');
{
  const rel = 'uebungen/fuegeverfahren/04-loesen-aber-wie.html';
  const { d } = await grundlagen(rel, 3);
  p('acht Verbindungen', d.querySelectorAll('#liste tr').length === 8);
  p('je drei Stufen zur Wahl',
    [...d.querySelectorAll('#liste select')].every((s) => s.options.length === 4));
  p('alle als Ankreuzfeld',
    d.querySelectorAll('#liste select[data-druck="ankreuzen"]').length === 8);
  p('Lösung je Verbindung', d.querySelectorAll('#loesungen div').length === 8);
}

console.log('\nTraining 1 – Prinzip-Schnellcheck');
{
  const rel = 'trainings/fuegeverfahren/01-prinzip-schnellcheck.html';
  const { d, w, laut } = await laden(rel);
  p('lädt ohne Fehler', !laut.length, laut.join(' | '));
  p('Durchgang steht', !!d.getElementById('bildFrage').querySelector('svg'));
  p('Frage gestellt', /überträgt hier die Kraft/.test(d.getElementById('frage').textContent));
  p('drei Antworten bei Mittel', d.querySelectorAll('#wahl button').length === 3);
  p('Tabelle mit 16 Verfahren', d.querySelectorAll('#tabelle tr').length === 16);
  p('Umfang ab 5 wählbar',
    d.getElementById('umfang').options[0].value === '5',
    d.getElementById('umfang').options[0].value);

  /* Eine Antwort geben: Die Begruendung muss sofort dastehen. */
  const knopf = d.querySelectorAll('#wahl button')[0];
  knopf.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('Rückmeldung kommt sofort', !d.getElementById('rueck').hidden);
  p('Begründung nennt die Wirkfläche',
    d.getElementById('rueck').textContent.length > 60);
  p('weiter wird angeboten', !d.getElementById('btnWeiter').hidden);
  p('Knöpfe gesperrt',
    [...d.querySelectorAll('#wahl button')].every((b) => b.disabled));

  /* Schwer bringt die vierte Antwort - sonst waere die Sonderform durch
     Ausschluss zu erraten. */
  const st = d.getElementById('stufe');
  st.value = 'schwer';
  st.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('vier Antworten bei Schwer', d.querySelectorAll('#wahl button').length === 4);
  p('mehr Verbindungen im Vorrat',
    Number(d.getElementById('umfang').options[d.getElementById('umfang').options.length - 1].value) === 16);

  st.value = 'einfach';
  st.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('bei Einfach nur die eindeutigen',
    Number(d.getElementById('umfang').options[d.getElementById('umfang').options.length - 1].value) === 10,
    d.getElementById('umfang').options[d.getElementById('umfang').options.length - 1].value);
}

console.log('\nTraining 2 – Begriffe der Fügetechnik');
{
  const rel = 'trainings/fuegeverfahren/02-begriffe-der-fuegetechnik.html';
  const { d, w, laut } = await laden(rel);
  p('lädt ohne Fehler', !laut.length, laut.join(' | '));
  p('Baukasten baut sich auf', !!d.getElementById('bk-knopf'));
  p('Herunterladen baut sich auf', !!d.getElementById('ex-knopf'));
  p('Bildungsgang wählbar', !!d.querySelector('#bk-bildungsgang select'));
  p('Rücklink zur Paketseite', !!d.getElementById('tbk-back'));
  p('Durchgang steht', d.getElementById('frage').textContent.trim().length > 2);
  p('vier Antworten', d.querySelectorAll('#wahl button').length === 4);
  p('Antworten sind verschieden',
    new Set([...d.querySelectorAll('#wahl button')].map((b) => b.textContent)).size === 4);
  p('Tafel hat alle Begriffe', d.querySelectorAll('#tafel tr').length >= 40,
    d.querySelectorAll('#tafel tr').length + ' Zeilen');
  p('Tafel zweispaltig',
    [...d.querySelectorAll('#tafel tr')].every((tr) => tr.children.length === 2));
  p('Tafel alphabetisch', (() => {
    const n = [...d.querySelectorAll('#tafel tr td:first-child')].map((e) => e.textContent);
    return n.join('|') === n.slice().sort((a, b) => a.localeCompare(b, 'de')).join('|');
  })());
  p('Umfang ab 5 wählbar', d.getElementById('umfang').options[0].value === '5',
    d.getElementById('umfang').options[0].value);

  /* Eine Antwort geben. */
  const knopf = d.querySelectorAll('#wahl button')[0];
  knopf.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('Rückmeldung kommt sofort', !d.getElementById('rueck').hidden);
  p('Rückmeldung nennt den Fachbegriff',
    /<strong>/.test(d.getElementById('rueck').innerHTML));
  p('genau eine Antwort als richtig markiert',
    d.querySelectorAll('#wahl button.war.ok').length === 1);
  p('weiter wird angeboten', !d.getElementById('btnWeiter').hidden);
  p('Knöpfe gesperrt',
    [...d.querySelectorAll('#wahl button')].every((b) => b.disabled));

  /* Richtung umstellen: Gefragt wird jetzt nach dem Fachbegriff. */
  const r = d.getElementById('richtung');
  r.value = 'alltag2fach';
  r.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Richtung wirkt auf die Fragezeile',
    /Welcher Fachbegriff/.test(d.getElementById('fragezeile').textContent),
    d.getElementById('fragezeile').textContent);
  const alsFach = [...d.querySelectorAll('#wahl button')].map((b) => b.textContent);
  p('Antworten sind jetzt Fachbegriffe',
    alsFach.every((t) => t.split(' ').length <= 3), alsFach.join(' / '));

  r.value = 'fach2alltag';
  r.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('andere Richtung fragt nach der Bedeutung',
    /Was bedeutet/.test(d.getElementById('fragezeile').textContent));
  p('Frage steht nicht unter den Antworten',
    [...d.querySelectorAll('#wahl button')]
      .every((b) => b.textContent !== d.getElementById('frage').textContent));
}

console.log('\nTraining 3 – Eigenschaften zuordnen');
{
  const rel = 'trainings/fuegeverfahren/03-eigenschaften-zuordnen.html';
  const { d, w, laut } = await laden(rel);
  p('lädt ohne Fehler', !laut.length, laut.join(' | '));
  p('Baukasten baut sich auf', !!d.getElementById('bk-knopf'));
  p('Herunterladen baut sich auf', !!d.getElementById('ex-knopf'));
  p('Bildungsgang wählbar', !!d.querySelector('#bk-bildungsgang select'));
  p('Rücklink zur Paketseite', !!d.getElementById('tbk-back'));
  p('Zeichnung zum Verfahren', !!d.getElementById('bildFrage').querySelector('svg'));
  /* Falz und Clinchen kommen mit zwei umgelegten Blechen aus - mehr als zwei
     Formen darf hier also nicht gefordert werden. */
  p('Zeichnung hat Inhalt',
    d.querySelectorAll('#bildFrage svg rect,#bildFrage svg path,#bildFrage svg line,#bildFrage svg circle,#bildFrage svg polygon').length >= 2,
    d.getElementById('frage').textContent);
  p('vier Aussagen', d.querySelectorAll('#wahl button').length === 4);
  p('Aussagen sind verschieden',
    new Set([...d.querySelectorAll('#wahl button')].map((b) => b.textContent)).size === 4);
  p('keine Klammer-Markierung sichtbar',
    ![...d.querySelectorAll('#wahl button')].some((b) => /\[TB\]/.test(b.textContent)));
  p('Nachschlagen führt alle 16 Verfahren',
    d.querySelectorAll('#nachschlagen details').length === 16,
    d.querySelectorAll('#nachschlagen details').length + ' Einträge');
  p('je Verfahren mindestens vier Merkmale',
    [...d.querySelectorAll('#nachschlagen details')]
      .every((e) => e.querySelectorAll('li').length >= 4),
    [...d.querySelectorAll('#nachschlagen details')]
      .map((e) => e.querySelectorAll('li').length).join(','));
  p('Schwerpunkt erklärt sich',
    d.getElementById('stufentext').textContent.length > 20);

  /* Antworten: Danach muss genau eine Aussage als die falsche markiert sein. */
  const knopf = d.querySelectorAll('#wahl button')[0];
  knopf.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('Rückmeldung kommt sofort', !d.getElementById('rueck').hidden);
  p('genau eine Aussage als falsch entlarvt',
    d.querySelectorAll('#wahl button.war.ok').length === 1);
  p('Begründung steht dabei',
    d.getElementById('rueck').textContent.length > 80);
  p('Knöpfe gesperrt',
    [...d.querySelectorAll('#wahl button')].every((b) => b.disabled));

  /* Schwerpunkt begrenzt den Vorrat. */
  const s = d.getElementById('schwerpunkt');
  const hoechst = () => {
    const o = d.getElementById('umfang').options;
    return Number(o[o.length - 1].value);
  };
  s.value = 'stoff';
  s.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Stoffschluss: drei Verfahren', hoechst() === 3, String(hoechst()));
  s.value = 'kraft';
  s.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Kraftschluss: vier Verfahren', hoechst() === 4, String(hoechst()));
  s.value = 'form';
  s.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Formschluss: sechs Verfahren', hoechst() === 6, String(hoechst()));
  s.value = 'blech';
  s.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Blech: sieben Verfahren', hoechst() === 7, String(hoechst()));
  p('nach dem Wechsel vier neue Aussagen',
    d.querySelectorAll('#wahl button').length === 4
      && [...d.querySelectorAll('#wahl button')].every((b) => !b.disabled));
}

console.log('\nLernsituation – Der Gehäusedeckel');
{
  const rel = 'lernsituationen/gehaeusedeckel/index.html';
  const { d, w } = await grundlagen(rel, 8);

  p('fünf Fügestellen zur Wahl',
    d.querySelectorAll('#prinzipien select').length === 5);
  p('alle als Ankreuzfeld',
    d.querySelectorAll('#prinzipien select[data-druck="ankreuzen"]').length === 5);
  p('drei Prinzipien je Stelle',
    [...d.querySelectorAll('#prinzipien select')]
      .every((s) => s.options.length === 4));
  p('Auflösung nennt alle fünf Verfahren',
    d.querySelectorAll('#aufloesung tbody tr').length === 5);
  p('Ziffern überall gleich',
    d.querySelectorAll('.stelle').length >= 20,
    d.querySelectorAll('.stelle').length + ' Ziffern');

  /* Der rechnende Weg gehoert nicht in jeden Bildungsgang. */
  p('Weg A ist gekennzeichnet',
    d.querySelectorAll('[data-bg-ohne="bfs-hs10 bfs-for"]').length === 2,
    d.querySelectorAll('[data-bg-ohne="bfs-hs10 bfs-for"]').length + ' Elemente');
  p('Weg B gilt für alle',
    ![...d.querySelectorAll('h3')]
      .some((h) => /Weg B/.test(h.textContent) && h.hasAttribute('data-bg-ohne')));
  p('die Seite selbst nimmt sich nicht aus',
    !d.querySelector('meta[name="bg-ohne"]'));

  /* Zwei Zeichnungen, beide mit Inhalt. */
  ['bildDeckel', 'bildSchnitt'].forEach((id) => {
    const svg = d.getElementById(id).querySelector('svg');
    p(id + ' gezeichnet', !!svg);
    p(id + ' hat Inhalt',
      svg && svg.querySelectorAll('rect,circle,path,line,text').length > 20,
      svg ? svg.querySelectorAll('rect,circle,path,line,text').length + ' Teile' : '-');
    p(id + ' hat eine Beschreibung',
      svg && (svg.getAttribute('aria-label') || '').length > 30);
  });
  p('keine doppelten Schraffurmuster',
    new Set([...d.querySelectorAll('pattern')].map((e) => e.id)).size
      === d.querySelectorAll('pattern').length);

  /* Die Ziffern in den Zeichnungen muessen lesbar beschriftet sein. */
  const beschriftung = [...d.querySelectorAll('#bildDeckel text')]
    .map((e) => e.textContent);
  p('Hinweise sind benannt',
    ['Tragöse', 'Typenschild', 'Rohrstutzen', 'Stifte']
      .every((t) => beschriftung.some((b) => b.indexOf(t) === 0)),
    beschriftung.join(' | '));

  /* Pruefen: erst offen, dann richtig, dann falsch. */
  const setzen = (i, wert) => {
    const s = d.getElementById('p' + i);
    s.value = wert;
    return s;
  };
  d.getElementById('btnPruefen').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('ohne Wahl kein Urteil',
    /offen|erst wählen/.test(d.getElementById('u1').textContent));

  ['kraft', 'form', 'stoff', 'stoff', 'stoff'].forEach((v, i) => setzen(i, v));
  d.getElementById('btnPruefen').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('richtige Wahl wird bestätigt',
    [0, 1, 2, 3, 4].every((i) => d.getElementById('u' + i).className === 'urteil ja'),
    [0, 1, 2, 3, 4].map((i) => d.getElementById('u' + i).textContent).join(' / '));

  setzen(0, 'stoff');
  d.getElementById('btnPruefen').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('falsche Wahl wird gemeldet',
    d.getElementById('u0').className === 'urteil nein');
  p('Rückmeldung verrät die Lösung nicht',
    !/Kraftschluss/.test(d.getElementById('u0').textContent),
    d.getElementById('u0').textContent);

  d.getElementById('btnZurueck').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('Zurücksetzen leert die Spalte',
    [0, 1, 2, 3, 4].every((i) => d.getElementById('p' + i).value === ''
      && d.getElementById('u' + i).textContent === ''));

  /* Die Zahlen muessen zueinander passen - sie stehen an mehreren Stellen. */
  const text = d.querySelector('main').textContent.replace(/\s+/g, ' ');
  ['ISO 4017', 'M8 × 30', '8.8', '13 N·m', '9,6 kN', '490'].forEach((z) => {
    p('Zahl steht da: ' + z, text.indexOf(z) >= 0);
  });
  p('Anziehdrehmoment nur einmal begründet',
    (text.match(/24,6/g) || []).length >= 2,
    'Tabellenwert erscheint ' + (text.match(/24,6/g) || []).length + '-mal');
}

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exit(fehler ? 1 : 0);
}

main();
