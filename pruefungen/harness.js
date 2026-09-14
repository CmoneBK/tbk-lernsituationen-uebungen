const fs = require('fs');
const BASIS = require('path').resolve(__dirname, '..');

const SCHLUSS = '<' + '/script>';          // nie literal, siehe unten

/* jsdom lädt keine externen Skripte. Die Bausteine aus assets/ werden deshalb
   vor dem Parsen in die Seite eingesetzt - so prüfen wir genau den Code, den
   der Browser auch lädt.
   Heikel dabei: Die Asset-Dateien zeigen in ihren Kommentaren, wie man sie
   einbindet - samt schließendem script-Tag. Inline würde das den Block
   vorzeitig beenden; über src (also im Browser) passiert das nie. Beim Inlinen
   wird die Zeichenfolge deshalb entschärft. */
function mitAssets(html) {
  return html.replace(
    /<script src="(?:\.\.\/)*(assets\/[a-z-]+\.js)"[^>]*>[\s\S]*?<\/script>/g,
    (_, datei) => {
      const quelle = fs.readFileSync(BASIS + '/' + datei, 'utf8')
        .split(SCHLUSS).join('<\\' + '/script>');
      return '<script>' + quelle + SCHLUSS;
    });
}

/* Die Bausteine bauen sich erst bei DOMContentLoaded auf. Wer sie mitpruefen
   will, muss darauf warten - sonst sieht der Test eine Seite, auf der noch
   keiner von ihnen gelaufen ist. */
function fertig(dom) {
  return new Promise(function (los) {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', function () { los(); });
    setTimeout(los, 2000);
  });
}

module.exports = { BASIS, mitAssets, fertig };
