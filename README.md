# 📚 Unterrichtsmaterial – Lernsituationen, Übungen, Trainings

Dieses Repository füllt den Bereich **Unterrichtsmaterial** auf [t-bk.de](https://t-bk.de).
Es funktioniert nach demselben Muster wie [CmoneBK-Unterrichtsmaterial](https://github.com/CmoneBK/CmoneBK-Unterrichtsmaterial)
(dort die Werkzeuge), mit einem bewussten Unterschied: **hier wird kein Jekyll verwendet.**

| | Werkzeuge-Repo | dieses Repo |
| --- | --- | --- |
| Übersicht entsteht durch | Jekyll/Liquid beim GitHub-Pages-Build | `build/build.mjs`, Ergebnis liegt als `index.html` im Repo |
| Rücklink kommt in die Seiten durch | Jekyll-Layout bzw. `deploy.sh` | eine Skript-Zeile in der Seite selbst |
| GitHub Pages | baut mit Jekyll | liefert nur aus (`.nojekyll`) |

Die ausgelieferten Dateien sind damit überall byte-gleich – auf GitHub Pages, auf t-bk.de
und beim lokalen Öffnen per Doppelklick.

## 🌐 Wo es landet

| Umgebung | Adresse | |
| --- | --- | --- |
| t-bk.de | `https://t-bk.de/unterrichtsmaterial/` | **live** |
| GitHub Pages | `https://cmonebk.github.io/tbk-lernsituationen-uebungen/` | nicht aktiviert, vorbereitet |

Der Weg auf die Seite: `git push` → GitHub → `deploy.sh` im Repo
[tbk-webseite](https://github.com/CmoneBK/tbk-webseite) zieht `main` per Cron
alle ~5 Minuten und spiegelt den Stand nach `/unterrichtsmaterial/`. Nach
spätestens fünf Minuten ist die Änderung online. Siehe [Deployment](#-deployment).

## 📂 Ordnerstruktur

```
lernsituationen/<name>/index.html   Lernsituation – selbst geschrieben
uebungen/<paket>/                   Übungspaket   – index.html wird ERZEUGT
trainings/<paket>/                  Trainingspaket – index.html wird ERZEUGT
assets/uebung.css        gemeinsames Aussehen aller Übungen und Trainings
assets/zeichnen.js       Bausteine für Zeichnungen (Maße, Schraffur, Diagramme)
assets/baukasten.js      Übungen zuschneiden und als Link weitergeben
assets/bildungsgang.js   Zuschnitt nach Bildungsgang – die Voreinstellung dafür
assets/qr.js             QR-Code für diesen Link
assets/export.js         Ausgabe als PDF und als Word-Datei
assets/pdf.js            schlanker PDF-Schreiber für den Direkt-Download
assets/thema.js          Umschalter hell / dunkel für den ganzen Bereich
assets/zahlenfeld.js     Mausrad in Zahlenfeldern, ohne die Seite zu verschieben
assets/back-nav.js       Rücklink als schwebender Knopf – einzige Quelle
assets/werkzeug-link.js  löst Links auf die Werkzeuge je nach Umgebung auf
vorlagen/CHECKLISTE.md   was eine neue Seite beachten muss
vorlagen/ZEICHNUNGSREGELN.md  wie technische Zeichnungen auszusehen haben
pruefungen/              alle Pruefungen - npm run pruefen (siehe README dort)
daten/kategorien.csv     Reihenfolge der Bereiche und Unterkategorien
daten/material.json      erzeugt: Bestand als Liste (für weitere Auswertungen)
build/build.mjs          Generator
build/uebersicht-vorlage.html  Design der Startseite   ┐ hier ändern,
build/paket-vorlage.html       Design der Paketseiten  ┘ dann neu bauen
vorlagen/lernsituation.html    Kopiervorlage für eine Lernsituation
vorlagen/uebung.html           Kopiervorlage für eine Übung im Paket
index.html               erzeugt – nicht von Hand bearbeiten
```

Die Trennung ist bewusst: **Übungen und Trainings sind Sammlungen**, deren
Übersichtsseite der Build schreibt. **Eine Lernsituation ist ein Dokument**,
das man selbst verfasst – ihren Inhalt fasst der Build nicht an; er trägt nur
die Bausteine nach, die unten beschrieben sind.

Einzelne `.html` direkt in `uebungen/` oder `trainings/` sind weiterhin
erlaubt; sie erscheinen dann als eigene Karte statt in einem Paket.

**Übung oder Training?** Technisch sind beide gleich gebaut – dieselbe `info.json`,
dasselbe CSS, dieselben Bausteine. Sie unterscheiden sich in der Absicht: Eine
**Übung** arbeitet einen Sachverhalt der Reihe nach durch, mit Lösungen zum
Aufklappen und offenen Fragen. Ein **Training** ist ein Durchgang mit vielen
kurzen Aufgaben, die der Rechner selbst auswertet – Punktestand, Wiederholung
der Fehler, Ergebnis am Ende. Wer sicher werden will, trainiert; wer verstehen
will, übt.

## 📦 Ein Paket anlegen

Ein Paket ist ein Ordner mit `info.json` und den einzelnen Übungen:

```
uebungen/schraubverbindungen/
    info.json
    03-wohin-geht-das-drehmoment.html
    index.html      ← erzeugt
```

```json
{
  "titel": "Maschinenelemente: Schrauben - Schraubverbindungen",
  "lead": "Ein Satz, der auf der Karte und über der Paketseite steht.",
  "werkzeuge": [
    { "datei": "maschinenelemente-schrauben-schraubverbindungen.html",
      "name": "Schraubverbindungen", "art": "lektion", "fach": "1" }
  ],
  "reihenfolge": ["03-wohin-geht-das-drehmoment.html"]
}
```

| Feld | |
| --- | --- |
| `titel` | folgt der [Titelkonvention](#titelkonvention) – **er** bestimmt Bereich und Unterkategorie |
| `lead` | optional, ein Satz |
| `werkzeuge` | optional, Dateinamen im Werkzeuge-Repo; siehe [Werkzeug-Links](#-werkzeug-links). `art` ist `lektion` oder `simulation` und steht im `<meta name="art">` der Werkzeugseite — die Paketseite macht daraus zwei Bereiche. Der Name traegt die Art nicht noch einmal. |
| `reihenfolge` | optional; was fehlt, wird alphabetisch angehängt – deshalb Dateien nummerieren |

Die Übungen im Paket brauchen im `<title>` **nur ihren Namen** – Bereich und
Kategorie stehen schon in `info.json`. Zusätzlich ausgewertet werden
`<meta name="description">` (Zeile unter dem Namen) und `<meta name="dauer">`.

### Das Aussehen einer Übung

Übungen und Trainings binden `assets/uebung.css` ein und sehen dadurch gleich
aus, ohne dass jede Datei ihr eigenes CSS mitschleppt:

```html
<link rel="stylesheet" href="../../assets/uebung.css">
```

Bereit stehen unter anderem `.box` / `.auftrag` (Kästen), `.felder` / `.feld`
(Eingaben), `.ergebnis` / `.ez` (Ergebniszeilen), `.rueckmeldung` mit den
Zuständen `ja` / `fast` / `nein`, `details` für Lösungen, `.merksatz` und
`a.werkzeug`. Was nur **eine** Übung braucht – eine Zeichnung, ein Diagramm –
gehört in ein eigenes `<style>` in der Datei selbst.

Eine Lernsituation darf ihr Aussehen selbst mitbringen – sie ist ein Dokument
mit eigenem Aufbau. Einfacher ist es, auch dort `assets/uebung.css` zu nehmen
und nur zu ergänzen, was dieses eine Dokument braucht: Dann sehen Kästen,
Eingaben und Lösungen überall gleich aus, und die Ausgabe als PDF oder Word
verhält sich wie in den Übungen. `vorlagen/lernsituation.html` zeigt den
eigenständigen Weg, `lernsituationen/konsole-am-foerderband/` den gemeinsamen.

### Hell oder dunkel

Oben rechts steht auf jeder Seite ein Schalter mit drei Zuständen:

| | |
| --- | --- |
| **System** | folgt der Einstellung von Betriebssystem und Browser – die Vorgabe |
| **Hell** | erzwingt die helle Palette |
| **Dunkel** | erzwingt die dunkle |

Die Wahl gilt für den **ganzen Materialbereich** – Übersicht, Paketseiten,
Übungen, Trainings, Lernsituationen. Gemerkt wird sie im `localStorage`, also
auf dem Gerät; übertragen wird nichts.

Umgesetzt ist das als `data-thema` am `html`-Element. Wer eigene Farben
definiert, braucht deshalb drei Regeln statt zwei:

```css
:root{ /* helle Farben */ }
@media (prefers-color-scheme:dark){
  :root:not([data-thema="hell"]){ /* dunkle Farben */ }
}
:root[data-thema="dunkel"]{ /* dieselben dunklen Farben */ }
```

Zwei Dinge, die man dabei wissen sollte:

* **`assets/thema.js` gehört in den `head`**, nicht ans Dateiende. Läuft es
  später, blitzt beim Laden kurz die falsche Palette auf. Der Build trägt die
  Zeile dort selbst ein.
* **Die Ausgabe bleibt hell.** `assets/export.js` schaltet dafür auf
  `html.ex-hell` um – und muss das ausdrücklich gewählte dunkle Thema
  ausstechen, deshalb steht dort `html.ex-hell, html.ex-hell[data-thema]`.
  Ohne das zweite Stück Selektor käme das PDF dunkel heraus.

### Zahlen einstellen

Ein Wert in einem Zahlenfeld lässt sich mit dem Mausrad verstellen – aber nur,
solange das Feld den Fokus hat. Während dessen scrollt die Seite nicht mit:
`assets/zahlenfeld.js` nimmt das Rad an sich, rechnet auf dem Raster aus `min`
und `step` und löst `input` aus, damit die Übung neu rechnet.

Die Bedingung „nur mit Fokus" ist Absicht. Ohne sie würde jedes Feld, an dem
man beim Lesen vorbeiscrollt, die Seite anhalten und dabei seinen Wert
verstellen. So muss man es erst anklicken; wer weiterlesen will, klickt daneben.

Zu tun ist dafür nichts außer `min`, `max` und `step` am Feld zu setzen – den
Rest trägt der Build ein.

### Zeichnungen

Technische Zeichnungen entstehen im Skript, nicht als Bilddatei – so bleiben
sie scharf, im dunklen Modus lesbar und können auf Eingaben reagieren.
`assets/zeichnen.js` liefert die Bausteine:

```html
<script src="../../assets/zeichnen.js"></script>
```

`bild()` legt ein SVG mit Bildunterschrift an, `linie()` / `kasten()` / `txt()`
zeichnen, `mass()` und `massV()` setzen Maße mit Hilfslinien und Pfeilen,
`schraffur()` liefert ein Schraffurmuster, `schraube()`, `senkschraube()`,
`hexKopf()` und `gewindeProfil()` die wiederkehrenden Bauteile, und
`achsenkreuz()` mit `kurve()` die Diagramme.

Zwei Festlegungen gelten dabei überall:

* **Gezeichnet wird in `currentColor`.** Damit stimmen heller und dunkler Modus
  von selbst, und eine Gruppe lässt sich über `style="color:var(--bad)"`
  einfärben – so werden Fehlerhinweise rot und Bestätigungen grün.
* **Die Strichstärke steht am Element, nie in einer CSS-Klasse.** Beim Gewinde
  trägt sie die fachliche Information (breite Vollinie außen, schmale innen)
  und darf nicht versehentlich überschrieben werden.

Schraffur-IDs gelten dokumentweit – jedes Bild braucht eigene, sonst zeigen
alle dasselbe Muster.

## ✂️ Übungen zuschneiden

Nicht jeder Teil passt zu jeder Lerngruppe oder jedem Bildungsgang. Deshalb
trägt jede Übung, jedes Training und jede Lernsituation unten rechts die
Schaltfläche **„Übung anpassen"**.
Dahinter lassen sich einzelne Teile und Aufgaben abwählen; daraus entsteht ein
Link und ein QR-Code, die die Übung genau so öffnen.

In einem Training heißt dieselbe Schaltfläche **„Training anpassen"**, in einer
Lernsituation **„Lernsituation anpassen"**. Woran das hängt, ist der Pfad:
`trainings/` oder `lernsituationen/` im Verzeichnis genügt, Baukasten und
Ausgabe richten sich danach. Einzutragen ist dafür nichts.

Ein Nebeneffekt beim lokalen Ausprobieren: Kopiert man eine Seite zum Testen in
einen anderen Ordner, steht wieder „Übung anpassen" dort – der Pfad stimmt dann
ja nicht mehr.

Die Datei selbst bleibt dabei unverändert – die Auswahl steckt allein in der
Adresse:

```
…/03-wohin-geht-das-drehmoment.html?ohne=k3fa.9x2m
```

Zwei Eigenschaften, die man kennen sollte:

* **Die Kennungen kommen aus den Überschriften, nicht aus ihrer Reihenfolge.**
  Wird eine Übung später umgestellt, zeigen alte Links weiterhin auf dasselbe.
* **Wird eine Überschrift umformuliert, greift der alte Link dort nicht mehr.**
  Dann erscheint der Teil wieder, statt dass ein falscher verschwindet – die
  harmlosere der beiden Richtungen.

Ein Training hat dabei eine Eigenheit: Sein **Ergebnis** ist kein Teil der
Gliederung, sondern der Ausgang des Durchgangs. Es steht deshalb unter `h3`, nicht
unter `h2` – sonst erschiene es im Baukasten als abwählbarer „Teil 2", und die
Nummerierung hätte eine Lücke, solange es noch verborgen ist.

Eingebunden werden `assets/qr.js` und `assets/baukasten.js`; beides trägt der
Build in jede Übung und jedes Training selbst ein. Zu tun ist dafür nichts –
außer die Gliederung mit `h2` und `details` aufzubauen, wie es die Vorlage
ohnehin vormacht.

### Voreinstellung nach Bildungsgang

Oben im selben Fenster steht die Wahl des Bildungsgangs. Sie setzt die Häkchen
auf das, was der Bildungsplan hergibt — mehr nicht: Danach lässt sich alles
wieder ändern. Gemerkt wird sie im `localStorage` (`tbk-bildungsgang`) und gilt
damit für den ganzen Bereich; weitergeben lässt sie sich als `?bg=…`.

Ein Teil, der nicht überall hingehört, sagt das selbst — an der Überschrift
oder am `summary`:

```html
<h2 data-bg-ohne="bfs-hs10 bfs-for">Die verspannte Verbindung</h2>
```

Eine ganze Seite nimmt sich im `head` aus:

```html
<meta name="bg-ohne" content="bfs-hs10 bfs-for">
```

Dann fehlt sie in der Übersicht und auf der Paketseite; wer sie trotzdem
öffnet, bekommt oben eine Zeile, die das sagt — gesperrt ist nichts.

**Kein Attribut heißt: gehört überall dazu.** Das ist die richtige Vorgabe;
neue Inhalte erscheinen erst einmal für alle. Jede Ausnahme gehört mit ihrer
Begründung in `bildungsgaenge/README.md` — siehe auch die
[Checkliste](vorlagen/CHECKLISTE.md).

Die sieben Schlüssel sind `bfs-hs10`, `bfs-for`, `hbfs-c2`, `fos-c3`, `im`,
`zm` und `tech`. Welcher Inhalt zu welchem Bildungsgang gehört und warum, steht
mitsamt den Bildungsplänen in `bildungsgaenge/` — dieser Ordner gehört wie
`tabellenbuch/` nicht ins Repo.

Steht ein Zuschnitt als `?ohne=…` in der Adresse, gilt der und nicht der
Bildungsgang: Jemand hat genau diese Zusammenstellung weitergegeben.

Der QR-Code entsteht im Browser, ohne Dienst und ohne Fremdbibliothek
(`assets/qr.js`, Byte-Modus, Fehlerkorrektur M, bis Version 10). Das ist
Bedingung, weil die Seite [nichts von fremden Servern lädt](#-trackingfrei--ohne-ausnahme).

## 🖨️ Als PDF oder Word mitnehmen

Neben *Übung anpassen* steht **„Herunterladen"**. Wählbar ist, ob die Lösungen
**unter den Aufgaben** stehen oder **gesammelt am Ende** auf eigener Seite.

| | |
| --- | --- |
| **Drucken / als PDF** | über den Druckdialog des Browsers. Das gibt das **schönste Ergebnis**: der Browser setzt die Seite mit ihrem eigenen Layout, Zeichnungen bleiben gestochen scharf, farbige Balken und Bänder kommen mit. Im Dialog als Ziel „Als PDF speichern" wählen. |
| **PDF herunterladen** | ohne Dialog, direkt als Datei. Gesetzt wird schlichter: Überschriften, Absätze, Listen, Tabellen als Zeilen, Zeichnungen als Bild. |
| **Word** | als **Web-Archiv** (MHTML) mit der Endung `.doc`. Word öffnet es und bearbeitet es weiter. Die Zeichnungen liegen als eigene Teile bei – Word lädt keine Bilder aus `data:`-Adressen, wohl aber Teile eines Archivs. |

Der PDF-Schreiber (`assets/pdf.js`) nutzt nur die Standardschriften des
PDF-Formats und bettet Bilder als JPEG ein. So braucht er weder eine
Fremdbibliothek noch eine eingebaute Breitentabelle: Gemessen wird im Browser
mit derselben Schrift, die das PDF später setzt.

Mitgenommen werden dabei nur **Zeichnungen (SVG)**, keine farbigen Kästen aus
HTML. Was eine Aussage über Farbe oder Länge trifft – ein Streuband, ein Balken,
eine Spanne –, gehört deshalb gezeichnet, nicht aus `div`-Kästen gebaut. Sonst
steht es auf dem Bildschirm, fehlt aber in PDF und Word.

Ausgegeben wird **genau der Stand, der gerade auf dem Bildschirm steht**: die
Auswahl aus *Übung anpassen*, die Werte in den Rechnern, der erreichte Schritt
einer Schrittfolge. Interaktives lässt sich auf Papier nun einmal nicht
bedienen – es erscheint eingefroren. Teile, die noch ausgeblendet sind (etwa
was erst nach dem Auflösen kommt), sind nicht dabei. Die Datei selbst weist
oben darauf hin.

### Was beim Ausdruck wegfällt

Die Ausgabe räumt auf: Skripte, Bedienknöpfe, die Leiste unten rechts und alles
Ausgeblendete verschwinden; Eingabefelder werden zu ihrem Wert. Zwei Angaben
steuern das aus der Übung heraus, falls die Vorgabe nicht passt:

| Angabe | Wirkung |
| --- | --- |
| `data-druck="text"` an einer Schaltfläche | Ihre Beschriftung ist Inhalt und bleibt (z. B. die anklickbaren Bausteine einer Schraubenbezeichnung). |
| `data-druck="weg"` an einem Element | Fällt in PDF und Word weg (z. B. „Noch nichts ausgewählt"). |
| `data-druck="ankreuzen"` an einem Auswahlfeld | Wird zu einer Liste zum Ankreuzen. Gedacht für Felder, die eine **Antwort** verlangen – Felder für Gewinde oder Festigkeitsklasse tragen dagegen nur einen eingestellten Wert und bleiben Text. |

Eine Schaltfläche, in der eine Zeichnung steckt, behält ihren Inhalt von selbst
– sie wird nur ihrer Hülle entledigt.

Leere Eingabefelder werden zur Schreiblinie – auf Papier soll man sie
ausfüllen können, statt eine Lücke zu sehen.

Für die Ausgabe schaltet die Seite auf die helle Farbpalette um. Sonst kämen
bei jemandem, der im dunklen Modus liest, weiße Striche auf weißem Papier
heraus. Beim Drucken sorgt zusätzlich `print-color-adjust: exact` dafür, dass
Hintergrundfarben mitkommen – ohne das lassen Browser sie weg, und damit genau
die Information, die in gefärbten Balken und Bändern steckt.

## ➕ Neues Material anlegen

> **[vorlagen/CHECKLISTE.md](vorlagen/CHECKLISTE.md)** fasst alles zusammen, was
> eine neue Seite beachten muss, damit Zuschnitt, Bildungsgang, Ausgabe und
> Thema von selbst funktionieren. Die Einzelheiten dazu stehen in den
> Abschnitten dieser README.

1. Vorlage kopieren: `vorlagen/uebung.html` in ein Paket,
   `vorlagen/lernsituation.html` nach `lernsituationen/<name>/index.html`
   (Dateinamen klein, mit Bindestrichen, ohne Umlaute).
2. Titel setzen – bei einer Lernsituation nach der Konvention unten, in einem
   Paket nur den Namen der Übung.
3. Inhalt schreiben — mit der [Checkliste](vorlagen/CHECKLISTE.md) daneben.
4. `node build/build.mjs` ausführen.
5. Committen und pushen – fertig.

Eine Lernsituation darf weitere Seiten und Bilder neben ihrer `index.html`
haben; in der Übersicht erscheint sie trotzdem als eine Karte. Optional kann
auch sie eine `info.json` bekommen – genutzt werden dort `titel`, `lead` und
`werkzeuge`, was besonders für Lernsituationen praktisch ist, die **mehrere**
Werkzeuge brauchen.

### Titelkonvention

`Bereich: Unterkategorie - Name`

* `Fertigungstechnik: Messmittel - Messschieber ablesen` → Bereich *Fertigungstechnik*, Kategorie *Messmittel*, Karte *Messschieber ablesen*
* `Fertigungstechnik: ISO-Toleranzen und Passungen` → ohne Unterkategorie, steht direkt unter dem Bereich
* ohne `:` → Bereich *Allgemein*

Zwei Regeln, die man kennen muss – identisch zum Werkzeuge-Repo:

1. Getrennt wird am ` - ` **mit Leerzeichen davor und dahinter**. Bindestriche im
   Text stören deshalb nicht: `Form- und Lagetoleranzen`, `Welle-Nabe-Verbindung`.
2. Ohne ` - ` gibt es keine Unterkategorie. `Messmittel Messschieber`
   (Bindestrich vergessen) landet also **nicht** unter „Messmittel“.
   Mehrfache Leerzeichen werden dagegen automatisch zusammengezogen.

### Reihenfolge der Kategorien

`daten/kategorien.csv` bestimmt, in welcher Reihenfolge Bereiche und
Unterkategorien erscheinen – nützlich überall dort, wo alphabetisch fachlich
falsch wäre (z. B. Instandhaltung nach DIN 31051: Wartung, Inspektion,
Instandsetzung, Verbesserung).

```csv
bereich,unterkategorie
Fertigungstechnik,Messmittel
Instandhaltung,Wartung
```

Was dort **nicht** steht, wird alphabetisch hinten angehängt – neues Material
erscheint also auch ohne Pflege der CSV, nur eben nicht an der gewünschten
Position. Kommata sind in den Werten nicht erlaubt.

## 🔨 Der Build

```bash
node build/build.mjs          # index.html + daten/material.json erzeugen
node build/build.mjs --check  # nur prüfen (Exit 1, wenn nicht aktuell)
```

Kein `npm install` nötig – der Generator kommt ohne Abhängigkeiten aus
(Node 18+). Er tut vier Dinge:

* **Startseite erzeugen.** Gliederung: Typ → Bereich → Unterkategorie. Dazu eine
  Filterleiste (Alle / Lernsituationen / Übungen / Trainings) und eine Suche –
  beides reines clientseitiges JavaScript ohne Abhängigkeiten. Die Suche eines
  Pakets greift auch auf die Titel der enthaltenen Übungen zu.
* **Paketseiten erzeugen.** Je Paket eine nummerierte Liste seiner Übungen samt
  Dauer, Kurzbeschreibung und Link zum passenden Werkzeug.
* **Bausteine nachtragen.** Was eine Seite braucht, trägt der Build vor dem
  schließenden `body`-Tag ein, mit der zur Ablagetiefe passenden Anzahl `../`:
  `assets/back-nav.js` immer (in einem Paket mit `data-ziel="./"`),
  `assets/thema.js` immer, und zwar in den `head`,
  `assets/werkzeug-link.js` bei einem Werkzeug-Link, `assets/zahlenfeld.js`
  bei einem Feld vom Typ `number` oder `range`, und in Übungen, Trainings wie
  Lernsituationen `bildungsgang.js`, `qr.js`, `baukasten.js`, `pdf.js`,
  `export.js` – in dieser Reihenfolge, weil der Baukasten die Wahl des
  Bildungsgangs liest. Dazu `assets/quellen.js`, sobald die Seite im Kopf
  sagt, woher ihre Zahlen stammen (siehe unten).
* **Front-Matter entfernen.** Ein `--- … ---`-Block am Dateianfang stammt aus dem
  Jekyll-Workflow des Werkzeuge-Repos. Ohne Jekyll stünde er als Text auf der
  Seite; er wird entfernt, ein dort notierter `title` aber vorher übernommen.

Jede dieser Änderungen wird auf der Konsole gemeldet.

Wird Material **direkt auf GitHub** abgelegt (Web-Oberfläche, API, Make.com),
übernimmt der Workflow [`.github/workflows/uebersicht.yml`](.github/workflows/uebersicht.yml)
denselben Build und committet das Ergebnis zurück.

## 📖 Woher die Zahlen stammen

Normmaße sind frei – sie stehen in der Norm und in jedem Herstellerkatalog.
Die **Zusammenstellung** eines Verlags ist es nicht: welche Zeilen, welche
Spalten, welche Auswahl – das ist die Arbeit, die jemand hineingesteckt hat.
Deshalb gilt im ganzen Material:

* Normmaße dürfen stehen, mit der **Norm** als Quelle.
* Kennwerte, die kein Normwert sind – Tragzahlen, Schnittdaten, Lote –
  gehören in die Aufgabe oder stehen als kleine Auswahl mit dem Hinweis auf
  den **Herstellerkatalog**.
* Zusammenstellungen eines Verlags werden **gekürzt** auf das, was gebraucht
  wird, und tragen ihren Nachweis.

Eine Seite sagt das in zwei Feldern im `head`:

```html
<meta name="quellen" content="tabellenbuch hersteller">
<meta name="normen" content="DIN EN ISO 4063, DIN EN ISO 6947">
```

Daraus baut `assets/quellen.js` eine Zeile über der Fußzeile, die auch beim
Ausdruck mitkommt. Die Schlüssel für `quellen` stehen in der Registry `TEXTE`
desselben Bausteins: `tabellenbuch`, `fachkunde-im`, `katalog`, `hersteller`,
`vdi2230`. **Eine Richtlinie ist keine Norm** – VDI 2230 hat deshalb einen
eigenen Schlüssel und gehört nicht in das Feld `normen`.

Eine Seite **ohne** fremde Zahlen bekommt kein Feld: Die Simulationen zu den
Messmitteln zeigen ein Messprinzip und schlagen nichts nach.

[`pruefungen/test-quellen.js`](pruefungen/test-quellen.js) hält das nach –
unbekannte Schlüssel, fehlende oder überflüssige Einbindung, Schiefes im Feld
`normen`. Und, solange `tabellenbuch/daten.json` lokal vorliegt, ob irgendwo
eine Verlagstabelle nahezu vollständig nachgebaut ist.

## 📕 Wenn kein Tabellenbuch auf dem Tisch liegt

Das Material setzt durchgehend voraus, dass jemand nachschlagen kann. In der
Berufsfachschule, Stufe HS10, ist das oft nicht der Fall. Dann steht ein Teil
der Aufgaben still – nicht, weil der Stoff zu schwer wäre, sondern weil die
Quelle fehlt.

`assets/tabellenbuch.js` kennt dafür drei Zustände:

| Zustand | Was passiert |
| --- | --- |
| `mit` | Das Buch liegt vor. Alles wie bisher – die Vorgabe. |
| `ohne` | Kein Buch. Was ohne Buch nicht geht, fällt weg. |
| `auszug` | Kein Buch. Die gebrauchten Zeilen stehen in der Aufgabe. |

Der Schalter steht neben dem Bildungsgang: auf der Startseite, auf jeder
Paketseite und im Fenster „Übung anpassen“ bzw. „Lektion anpassen“. Er lässt
sich als `?tb=…` weitergeben. **Wer `bfs-hs10` wählt, bekommt `ohne`
vorgeschlagen** – vorgeschlagen, nicht gesetzt: Eine eigene Wahl gilt vor dem
Vorschlag, auch `mit`.

Eine Seite spielt so mit:

```html
<details data-tb="noetig">…</details>     <!-- fällt bei "ohne" weg -->
<div class="tb-auszug" data-tb="auszug">…</div>  <!-- nur bei "auszug" -->
<meta name="tb" content="noetig">         <!-- die ganze Seite braucht es -->
```

`data-tb` darf an **jedem** Element stehen – an einer Aufgabe, einer
Teilaufgabe, einer Tabellenzeile. Nur an einer `h2` meint es den ganzen
Abschnitt bis zur nächsten `h2`, sonst verschwände bloß die Überschrift.

Drei Regeln für einen Auszug:

* **Mit Nachbarzeilen.** Die gebrauchte Zeile plus je eine darüber und
  darunter – die richtige zu finden bleibt die Aufgabe.
* **Ohne Hervorhebung.** Im Buch ist auch nichts hervorgehoben.
* **Nicht in einem `<details>`.** Dort stünde er hinter der Lösung.

Ein Auszug ist **immer** verborgen, außer im Zustand `auszug` – auch „alle
Inhalte zeigen“ holt ihn nicht hervor. Er ist kein weggelassener Teil, sondern
ein Ersatz für etwas, das sonst auf dem Tisch liegt. Und er bleibt ein Auszug:
ein paar Zeilen mit Quellenangabe, keine nachgebaute Tabelle – siehe oben,
„Woher die Zahlen stammen“.

[`pruefungen/test-ohne-tabellenbuch.js`](pruefungen/test-ohne-tabellenbuch.js)
prüft beides: die Mechanik und die Auszeichnung.

## ↩️ Rücklink zur Übersicht

Jede Seite bekommt oben links eine schwebende Schaltfläche **„← Übersicht“**
(auf schmalen Displays nur den Pfeil). `assets/back-nav.js` ist die einzige
Quelle für Aussehen und Ziel.

Das Ziel wird aus dem eigenen Skript-Pfad abgeleitet, nicht fest verdrahtet:
`…/assets/back-nav.js` minus `assets/back-nav.js` ist immer die Wurzel des
Materialbereichs – unabhängig von Ablagetiefe und Ausspielpfad.

| Umgebung | Seiten-URL | Ziel |
| --- | --- | --- |
| GitHub Pages | `…/tbk-lernsituationen-uebungen/uebungen/x.html` | `…/tbk-lernsituationen-uebungen/` |
| t-bk.de | `t-bk.de/unterrichtsmaterial/uebungen/x.html` | `t-bk.de/unterrichtsmaterial/` |
| lokal | `…/uebungen/x.html` | Repo-Wurzel |

Innerhalb eines Pakets wäre das aber einen Schritt zu weit: Von einer Übung
will man zurück zum Paket, nicht bis zur Startseite. Dafür trägt der Build am
Skript-Tag `data-ziel="./"` ein.

Zwei Angaben sind möglich:

| Attribut | Wirkung |
| --- | --- |
| `data-ziel="./"` | wohin (Vorgabe: die Wurzel des Bereichs) |
| `data-text="Startseite"` | wie er heißt (Vorgabe: „Übersicht") |

Damit tragen auch die Bereichsseiten denselben Knopf — die Übersicht des
Materials, die der Werkzeuge, Impressum und Datenschutz. Vorher stand dort
eine blaue Textzeile, während jede Inhaltsseite den schwebenden Knopf hatte.

Ein `data-ziel="/"` zeigt auf die Wurzel der Domain, und die gibt es nur auf
t-bk.de: Auf GitHub Pages wäre das die Profilseite, lokal das Dateisystem.
Dort erscheint der Rücklink deshalb gar nicht — das entscheidet der Baustein
selbst.

**Platz lassen:** Der Knopf schwebt oben links. Liegt die Überschrift darunter,
deckt er ihren ersten Buchstaben zu. Die Seiten geben ihm deshalb oben etwa
56–62 px Luft — und zwar an einem Selektor, der auch greift: `header{…}` wird
von einem `.wrap` an demselben Element ausgestochen.

Aussehen oder Ziel ändert man also ausschließlich in `assets/back-nav.js`.
Der Block verwendet eine eigene ID (`#tbk-back`) und `!important`, damit ihn
die sehr unterschiedlichen Seiten-Designs (helle wie dunkle) nicht überschreiben.

## 🔗 Werkzeug-Links

Die interaktiven Werkzeuge liegen im **anderen** Repo. Wo sie zu finden sind,
hängt davon ab, wo die Seite gerade ausgeliefert wird – ein fester Pfad
funktioniert deshalb nicht. `assets/werkzeug-link.js` nimmt das ab: Im Text
wird nur das Ziel benannt, das `href` entsteht beim Laden.

```html
<a class="werkzeug" data-werkzeug="maschinenelemente-schrauben-schraubverbindungen.html"
   data-fach="1">Werkzeug öffnen</a>
```

| Umgebung | aufgelöst zu |
| --- | --- |
| t-bk.de | `/werkzeuge/tools/<datei>` |
| GitHub Pages | `https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/tools/<datei>` |
| lokal (`file:`) | Nachbarordner `CmoneBK-Unterrichtsmaterial/tools/` |

Weitere Angaben, alle optional: `data-fach="1"` startet das Werkzeug mit
Fachbegriffen statt Alltagssprache, `data-sym="1"` mit Formelzeichen,
`data-neu="0"` öffnet im selben Tab. `data-reiter="…"` ist vorbereitet – es
wirkt erst, wenn das Werkzeug den Parameter auswertet, und schadet bis dahin nicht.

Ein Paket braucht den Link nicht in jeder Übung zu wiederholen: Was in
`info.json` unter `werkzeuge` steht, erscheint schon oben auf der Paketseite.

## 🚀 Deployment

**`git push` genügt.** Ein `deploy.sh` im Repo
[tbk-webseite](https://github.com/CmoneBK/tbk-webseite) läuft auf dem Server per
Cron alle ~5 Minuten, zieht `main` und spiegelt den Stand nach
`/unterrichtsmaterial/`. Die Einrichtung ist abgeschlossen – am Server ist
nichts mehr zu tun.

```
tbk-webseite/public          → DocumentRoot
CmoneBK-Unterrichtsmaterial  → /werkzeuge/
dieses Repo                  → /unterrichtsmaterial/
valis, bk-e-plan             → /projekte/…
```

Der Server **baut nichts**: kein Jekyll, keine Actions, kein Node. Gespiegelt
wird 1:1, was hier committet ist. Deshalb gilt:

* **Erzeugte Dateien mitcommitten.** Nach jeder inhaltlichen Änderung
  `node build/build.mjs`, dann committen. `--check` sagt, ob etwas fehlt.
* **Nicht veröffentlicht** werden `.git/`, `.github/`, `.claude/`, `build/`,
  `vorlagen/`, `README.md`, `DEPLOYMENT.md`, `package.json`. Entwürfe und
  Quellen gehören genau dorthin.
* `/unterrichtsmaterial/` wird mit `rsync --delete` gespiegelt und ist damit
  faktisch schreibgeschützt – dort keine Laufzeitdaten ablegen.

Einzelheiten und die Regeln zum Server: [DEPLOYMENT.md](DEPLOYMENT.md).

## 🔒 Trackingfrei – ohne Ausnahme

t-bk.de kommt ohne Werbung und ohne Tracking aus. Für jede Seite in diesem Repo
heißt das: **keine externen Ressourcen.** Keine Google Fonts, keine CDNs, keine
Analytics, keine Fremdskripte, keine fremdgehosteten Videos. Alles liegt im Repo
und wird relativ eingebunden.

Systemschriften (`system-ui`, `-apple-system`, `Segoe UI`, …) sind ausdrücklich
erwünscht – sie laden nichts nach. `assets/uebung.css` nutzt genau die.

## 🔧 Fehlerbehebung

| Symptom | Ursache |
| --- | --- |
| Karte fehlt in der Übersicht | `node build/build.mjs` vergessen, Paket ohne `info.json`, oder Lernsituation ohne `index.html` |
| Karte steht unter „Allgemein“ | `:` im `<title>` fehlt |
| Unterkategorie wird ignoriert | ` - ` ohne Leerzeichen geschrieben |
| `--- title: … ---` steht sichtbar auf der Seite | Front-Matter; einmal `node build/build.mjs` laufen lassen |
| Rücklink fehlt | `assets/back-nav.js` nicht erreichbar – Anzahl der `../` prüfen |
| Umschalter fehlt oder die Seite bleibt dunkel | `assets/thema.js` fehlt im `head`, oder die eigenen Farben der Seite kennen die drei Regeln von oben nicht |
| Mausrad verstellt den Wert nicht | Das Feld hat keinen Fokus (erst hineinklicken), oder `assets/zahlenfeld.js` fehlt – einmal `node build/build.mjs` laufen lassen |
| Rücklink springt zu weit zurück | `data-ziel="./"` am Skript-Tag fehlt (Datei liegt in einem Paket) |
| Werkzeug-Link führt ins Leere | `data-werkzeug` statt `href` verwenden; Dateiname muss dem im Werkzeuge-Repo entsprechen |
| Übung fehlt auf der Paketseite | Datei heißt `index.html` – die wird erzeugt und deshalb übersprungen |
| Reihenfolge stimmt nicht | Bereich/Kategorie in `daten/kategorien.csv` ergänzen, im Paket `reihenfolge` in `info.json` |
| Lösung steht sofort da, statt erst nach dem Auflösen | Der verbergende Abschnitt enthält ein `h2` – der Baukasten hält ihn dann für einen eigenen Teil. Überschrift auf `h3` setzen |
| Farbiger Balken fehlt in PDF und Word | Er besteht aus HTML-Kästen. Als SVG zeichnen (siehe [Zeichnungen](#zeichnungen)) |
