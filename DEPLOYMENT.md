# Wie dieses Repo live geht

Der Bereich https://t-bk.de/unterrichtsmaterial/ wird aus diesem Repo gespeist.
Die Einrichtung ist abgeschlossen – **am Server ist nichts mehr zu tun.**

## Der einzige Weg zum Live-Gang

```bash
node build/build.mjs        # erzeugte Dateien aktualisieren
git add -A && git commit -m "…"
git push
```

Das war es. Ein `deploy.sh` im Repo [tbk-webseite](https://github.com/CmoneBK/tbk-webseite)
läuft auf dem Server per Cron alle ~5 Minuten, zieht `main` und spiegelt den
Stand nach `/unterrichtsmaterial/`. Nach spätestens fünf Minuten ist die
Änderung online.

## Was der Server tut – und was nicht

| | |
| --- | --- |
| Build ausführen | **nein** |
| Jekyll | **nein** |
| GitHub Actions oder Pages nutzen | **nein** |
| committete Dateien 1:1 spiegeln | ja, mit `rsync --delete` |

Daraus folgen vier Regeln, die man nicht verletzen darf:

1. **Erzeugte Dateien gehören in den Commit.** Ausgeliefert wird die
   `index.html`, die hier liegt – nicht eine, die jemand baut. Nach jeder
   inhaltlichen Änderung also `node build/build.mjs` laufen lassen und das
   Ergebnis mitcommitten. `node build/build.mjs --check` sagt, ob etwas fehlt.
2. **Alles Sichtbare liegt außerhalb der ausgeschlossenen Pfade.** Nicht
   veröffentlicht werden `.git/`, `.github/`, `.claude/`, `build/`, `vorlagen/`,
   `README.md`, `DEPLOYMENT.md` und `package.json`. Entwürfe und Quellen gehören
   genau dorthin – Vorlagen nach `vorlagen/`, Generator und Design nach `build/`.
3. **Keine Laufzeitdaten im Zielverzeichnis.** `rsync --delete` macht
   `/unterrichtsmaterial/` faktisch schreibgeschützt; alles, was dort nicht aus
   dem Repo stammt, ist beim nächsten Lauf weg.
4. **Pfade relativ halten.** Der Bereich liegt unter `/unterrichtsmaterial/`,
   auf GitHub Pages unter einem anderen Präfix und lokal unter gar keinem.
   Absolute Pfade brechen mindestens einen dieser Fälle. Für Links auf die
   Werkzeuge gibt es `assets/werkzeug-link.js`, für den Rücklink
   `assets/back-nav.js` – beide leiten ihr Ziel selbst ab.

## Trackingfrei – ohne Ausnahme

t-bk.de kommt ohne Werbung und ohne Tracking aus. Für dieses Repo heißt das:
**keine externen Ressourcen.** Keine Google Fonts, keine CDNs, keine Analytics,
keine Fremdskripte, keine eingebetteten Videos von anderswo. Alles, was eine
Seite braucht, liegt im Repo und wird relativ eingebunden.

Systemschriften (`system-ui`, `-apple-system`, `Segoe UI`, …) sind ausdrücklich
erwünscht – sie laden nichts nach und sehen auf jedem Gerät passend aus.

Prüfen lässt sich das mit einem Blick:

```bash
grep -rInoE '(src|href)="(https?:)?//[^"]*"' --include="*.html" --include="*.css" \
  index.html assets/ lernsituationen/ uebungen/ trainings/ | grep -v 't-bk.de'
```

Kommt nichts zurück, ist alles in Ordnung.

## Zugriff auf den Server

SSH als `ctnutzerone` ist **absichtlich deaktiviert** – ein abgelehnter Schlüssel
ist kein Fehler. Server-Operationen laufen als root über
`runuser -u ctnutzerone` und gehören in den Website-/Infra-Kontext, nicht hierher.

Insbesondere darf der Server-Klon unter
`/home/users/ctnutzerone/git/tbk-lernsituationen-uebungen` **nicht** als root neu
geklont oder angefasst werden: Git würde ihn danach als *dubious ownership*
verweigern und der Cron-Sync bliebe stehen.

## GitHub Actions und Pages

Beides ist für den Live-Betrieb **nicht nötig** und rein optional:

* `.github/workflows/uebersicht.yml` baut die Übersicht nach, wenn Material
  einmal direkt über die GitHub-Oberfläche oder per API landet statt über einen
  lokalen Build. Solange erzeugte Dateien mitcommittet werden (Regel 1), hat der
  Workflow nichts zu tun und endet ohne Commit. Damit er im Bedarfsfall
  zurückschreiben kann, bräuchte er unter *Settings → Actions → General →
  Workflow permissions* **Read and write**; aktuell steht dort *read*.
* **GitHub Pages** wäre eine Vorschau unter
  `https://cmonebk.github.io/tbk-lernsituationen-uebungen/` und ist nicht
  aktiviert. Das Repo ist darauf vorbereitet (`.nojekyll`, relative Pfade), falls
  es einmal gewünscht ist.
