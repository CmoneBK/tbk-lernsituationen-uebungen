/* Die Uebungen zu den Schraubverbindungen: Laufen sie, nehmen sie
   Eingaben an, und stimmt die Rueckmeldung? */
const fs = require('fs'), path = require('path');
const { BASIS, mitAssets, fertig } = require('./harness');
const { JSDOM, VirtualConsole } = require('jsdom');

const dir = path.join(BASIS, 'uebungen/schraubverbindungen');

async function main() {
let fehlerGesamt = 0;

for (const datei of fs.readdirSync(dir).filter(f => /^\d/.test(f)).sort()) {
  const fehler = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => fehler.push('Laufzeit: ' + (e.detail || e).toString().split('\n')[0]));
  vc.on('error', (...a) => fehler.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(dir, datei), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc, url: 'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/' + datei,
  });
  // jsdom kennt scrollIntoView nicht - in jedem Browser vorhanden, hier stubben.
  dom.window.Element.prototype.scrollIntoView = function(){};
  await fertig(dom);
  const d = dom.window.document;
  const text = () => d.body.textContent;

  const pruefe = (was, bed) => { if (!bed) fehler.push(was); };

  // Nach dem Laden dürfen keine "–"-Platzhalter mehr in Ergebnisfeldern stehen,
  // wo die Seite sofort rechnet.
  const klick = (sel) => { const e = d.querySelector(sel); if (e) e.click(); else fehler.push('kein ' + sel); };

  if (datei.startsWith('01')) {
    klick('#bez button[data-t="klasse"]');
    pruefe('Baustein-Text leer', d.getElementById('bezText').textContent.includes('800'));
    pruefe('Längenrechner ohne Ergebnis', d.getElementById('lEmpf').textContent === '65');
    pruefe('60 mm nicht als zu kurz erkannt', d.getElementById('lRueck').className.includes('nein'));
    d.getElementById('lWahl').value = '65';
    d.getElementById('lWahl').dispatchEvent(new dom.window.Event('change'));
    pruefe('65 mm nicht als passend erkannt', d.getElementById('lRueck').className.includes('ja'));
  }

  if (datei.startsWith('02')) {
    pruefe('vier Bilder erwartet', d.querySelectorAll('.figur').length === 4);
    pruefe('SVG fehlt', d.querySelectorAll('.figur svg').length === 4);
    // Schraffur-IDs gelten dokumentweit: zwei gleiche, und alle Bilder zeigen
    // dasselbe Muster.
    var musterIds = [...d.querySelectorAll('pattern')].map(p => p.id);
    pruefe('Schraffur-IDs nicht eindeutig (' + musterIds.length + ' Muster)',
      new Set(musterIds).size === musterIds.length && musterIds.length >= 8);
    d.querySelectorAll('.figur')[3].click();          // Bild D = richtig
    pruefe('richtige Antwort nicht erkannt', d.getElementById('rueck').className.includes('ja'));
    pruefe('Teil 2 bleibt verborgen', !d.getElementById('teil2').hidden);
    ['bildGewindelinien','bildWelle','bildTrennfuge'].forEach(function(id){
      var f = d.getElementById(id), svg = f && f.querySelector('svg');
      pruefe(id + ' fehlt', !!svg);
      if (!svg) return;
      pruefe(id + ': fast leer', svg.querySelectorAll('line,rect,path,text').length > 8);
      pruefe(id + ': keine Bildunterschrift', !!f.querySelector('figcaption'));
      var vb = svg.getAttribute('viewBox').split(' ').map(Number);
      for (var e of svg.querySelectorAll('line,rect,text')) {
        for (var a of ['x','y','x1','y1','x2','y2']) {
          var v = e.getAttribute(a);
          if (v === null) continue;
          var grenze = a[0] === 'x' ? vb[2] : vb[3];
          if (Number(v) < -2 || Number(v) > grenze + 2)
            fehler.push(id + ': ' + e.tagName + ' ' + a + '=' + v + ' außerhalb 0..' + grenze);
        }
      }
    });
  }

  if (datei.startsWith('03')) {
    pruefe('Teil 2 vorzeitig sichtbar', d.getElementById('aufloesung').hidden);
    klick('#btnAufloesen');
    pruefe('Auflösung bleibt verborgen', !d.getElementById('aufloesung').hidden);
    var balken = d.getElementById('bild1');
    pruefe('kein Balken gezeichnet', !!balken.querySelector('svg'));
    pruefe('Balken ohne drei Anteile', balken.querySelectorAll('rect[fill^="#"]').length === 3);
    pruefe('Balken ohne Beschriftung', /1[45] %/.test(balken.textContent));
    pruefe('Tabelle leer', d.getElementById('tab1Body').children.length === 4);
    // Tabellenbuch: M12 8.8 bei my = 0,12 -> 43,0 kN. Wir runden auf 43,1.
    pruefe('FM fehlt', d.getElementById('eFM').textContent === '43,1');
  }

  if (datei.startsWith('04')) {
    // Ohne Auswahl darf nicht aufgelöst werden.
    klick('#btnAufloesen');
    pruefe('ohne Schätzung schon aufgelöst', d.getElementById('rest').hidden);
    pruefe('kein Hinweis zum Schätzen', d.getElementById('rueck').className.includes('fast'));
    d.getElementById('tipp').value = '2.2';

    ['bildVerfahren','bildUeberdehnt'].forEach(function(id){
      var f = d.getElementById(id), svg = f && f.querySelector('svg');
      pruefe(id + ' fehlt', !!svg);
      if (!svg) return;
      pruefe(id + ': fast leer', svg.querySelectorAll('line,path,text,circle').length > 12);
      pruefe(id + ': keine Bildunterschrift', !!f.querySelector('figcaption'));
      var vb = svg.getAttribute('viewBox').split(' ').map(Number);
      for (var e of svg.querySelectorAll('line,text,circle')) {
        for (var a of ['x','y','x1','y1','x2','y2','cx','cy']) {
          var v = e.getAttribute(a);
          if (v === null) continue;
          var grenze = (a[0] === 'x' || a === 'cx') ? vb[2] : vb[3];
          if (Number(v) < -2 || Number(v) > grenze + 2)
            fehler.push(id + ': ' + e.tagName + ' ' + a + '=' + v + ' außerhalb 0..' + grenze);
        }
      }
    });

    klick('#btnAufloesen');
    pruefe('Faktor falsch', d.getElementById('rFaktor').textContent === '2,20');
    // 80 Nm: die trockene Schraube haelt knapp (26,3 kN > 25 kN), die geschmierte
    // wird ueberdehnt - also "fast", nicht "nein".
    pruefe('Urteil nicht "Gefahr der Ueberdehnung"', d.getElementById('urteil').className.includes('fast'));
    pruefe('Zugfestigkeit fehlt in der Fußnote',
      /R.{0,12}m/.test(d.getElementById('grenzen').textContent) &&
      d.getElementById('grenzen').textContent.includes('800'));
    // Die Skala ist eine Zeichnung; die vier Zonen sind gefuellte Rechtecke.
    var skala = d.getElementById('bildSkala');
    pruefe('keine Skala gezeichnet', !!skala.querySelector('svg'));
    pruefe('Zonen fehlen', skala.querySelectorAll('rect[fill^="#"]').length >= 4);
    pruefe('Bruchzone fehlt', !!skala.querySelector('rect[fill="#7f1d1d"]'));
    pruefe('Marken fehlen', skala.textContent.includes('Streckgrenze') && skala.textContent.includes('Bruch'));
    d.getElementById('eMA').value = '75';
    d.getElementById('eMyMin').value = '0.10';
    d.getElementById('eMyMax').value = '0.14';
    ['eMA','eMyMin','eMyMax'].forEach(i => d.getElementById(i).dispatchEvent(new dom.window.Event('input')));
    pruefe('75 Nm mit mu 0,10..0,14 nicht als sicher erkannt (' +
      d.getElementById('rMin').textContent + '..' + d.getElementById('rMax').textContent + ')',
      d.getElementById('urteil').className.includes('ja'));
  }

  if (datei.startsWith('05')) {
    ['bildAusgangslage','bildMehrSchrauben','bildTrennfugen','bildFormschluss','bildSpiel']
      .forEach(function(id){
        var f = d.getElementById(id), svg = f && f.querySelector('svg');
        pruefe(id + ' fehlt', !!svg);
        if (!svg) return;
        pruefe(id + ': fast leer', svg.querySelectorAll('line,rect,path,text,circle,polygon').length > 10);
        pruefe(id + ': keine Bildunterschrift', !!f.querySelector('figcaption'));
        var vb = svg.getAttribute('viewBox').split(' ').map(Number);
        for (var e of svg.querySelectorAll('line,rect,text,circle')) {
          for (var a of ['x','y','x1','y1','x2','y2','cx','cy']) {
            var v = e.getAttribute(a);
            if (v === null) continue;
            var grenze = (a[0] === 'x' || a === 'cx') ? vb[2] : vb[3];
            if (Number(v) < -2 || Number(v) > grenze + 2)
              fehler.push(id + ': ' + e.tagName + ' ' + a + '=' + v + ' außerhalb 0..' + grenze);
          }
        }
      });
    // Eigener Reibungswert aus dem Tabellenbuch
    pruefe('Eingabefeld vorzeitig sichtbar', d.getElementById('eigenFeld').hidden);
    d.getElementById('ePaarung').value = 'eigen';
    d.getElementById('ePaarung').dispatchEvent(new dom.window.Event('change'));
    pruefe('Eingabefeld bleibt verborgen', !d.getElementById('eigenFeld').hidden);
    pruefe('Einzelwert als Bereich dargestellt',
      !d.getElementById('paarungHinweis').textContent.includes('bis'));
    pruefe('Einzelwert 0,15: Qmin und Qmax verschieden',
      d.getElementById('rQmin').textContent === d.getElementById('rQmax').textContent);
    pruefe('Einzelwert 0,15 nicht als "hält nicht" bewertet (13,2 < 12? nein)',
      d.getElementById('urteil').className.includes('ja'));
    d.getElementById('ePaarung').value = '0';
    d.getElementById('ePaarung').dispatchEvent(new dom.window.Event('change'));
    pruefe('Rückkehr zum Bereich misslungen', d.getElementById('eigenFeld').hidden);

    // Tabellenbuch: M10 8.8 bei my = 0,12 -> 29,6 kN.
    pruefe('FM falsch', d.getElementById('rFM').textContent === '29,6');
    pruefe('Qmin falsch', d.getElementById('rQmin').textContent === '9,5');
    pruefe('keine Spanne gezeichnet', !!d.getElementById('bildSpanne').querySelector('svg'));
    pruefe('Marke fehlt', d.getElementById('bildSpanne').textContent.includes('gefordert'));
    pruefe('Urteil nicht "vielleicht"', d.getElementById('urteil').className.includes('fast'));
    // Die gestrahlte Flaeche steht nicht an fester Stelle - nach Namen suchen.
    const gestrahlt = dom.window.PAARUNGEN.findIndex(p => /gestrahlt/.test(p.name));
    d.getElementById('ePaarung').value = String(gestrahlt);
    d.getElementById('ePaarung').dispatchEvent(new dom.window.Event('change'));
    pruefe('gestrahlt nicht als sicher erkannt', d.getElementById('urteil').className.includes('ja'));
  }

  if (datei.startsWith('06')) {
    pruefe('Tabelle leer', d.getElementById('tabBody').children.length === 5);
    pruefe('67 kN Bruchkraft fehlt', text().includes('67 kN'));
    const k = d.getElementById('frage').textContent.replace('Festigkeitsklasse ', '');
    const [a, b] = k.split('.').map(Number);
    d.getElementById('aRm').value = String(a * 100);
    d.getElementById('aRp').value = String(a * b * 10);
    klick('#btnPruefen');
    pruefe('richtige Eingabe nicht erkannt', d.getElementById('rueck').className.includes('ja'));
    klick('#btnWeiter');
    pruefe('keine nächste Frage', d.getElementById('aRm').value === '');

    // Die Tabelle darf erst erscheinen, wenn alle fünf Klassen dran waren.
    pruefe('Tabelle zu früh sichtbar', d.getElementById('teil2').hidden);
    for (var n = 0; n < 6; n++) {
      if (!d.getElementById('teil2').hidden) break;
      klick('#btnPruefen');
      klick('#btnWeiter');
    }
    pruefe('Tabelle bleibt verborgen', !d.getElementById('teil2').hidden);
    pruefe('Sperrhinweis nicht aktualisiert',
      d.getElementById('sperre').textContent.includes('Alle fünf'));
  }

  console.log((fehler.length ? 'FEHLER ' : 'ok     ') + datei +
    (fehler.length ? '\n         ' + fehler.join('\n         ') : ''));
  fehlerGesamt += fehler.length;
}

console.log(fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.' : '\nAlle Interaktionen laufen.');
process.exitCode = fehlerGesamt ? 1 : 0;
}

main();
