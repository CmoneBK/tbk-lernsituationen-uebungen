# Inbetriebnahme

Alle Schritte sind **einmalig**. Danach reicht `git push`.

## 1. GitHub-Repository anlegen und befüllen

Vorausgesetzter Name: **`tbk-lernsituationen-uebungen`** unter dem Account `CmoneBK`.
Ein anderer Name ist möglich – dann aber an drei Stellen anpassen:
`deploy.sh` (Variable `LERN_DIR`) im Repo `tbk-webseite`, der `git clone`-Befehl
unter Punkt 3 und die Links in der `README.md`.

```bash
cd "K:/OneDrive/VSCode Projects/LernsituationenÜbungenTrainings"
gh repo create CmoneBK/tbk-lernsituationen-uebungen --public --source=. --remote=origin --push
```

Ohne `gh`: Repository auf github.com anlegen, dann

```bash
git remote add origin https://github.com/CmoneBK/tbk-lernsituationen-uebungen.git
git push -u origin main
```

## 2. GitHub Pages einschalten (optional, aber praktisch zum Vorschauen)

*Settings → Pages → Build and deployment*

* **Source:** „Deploy from a branch“
* **Branch:** `main`, Ordner `/ (root)`

Kein Jekyll-Build nötig – `.nojekyll` im Repo sorgt dafür, dass GitHub die
Dateien unverändert ausliefert. Ergebnis:
`https://cmonebk.github.io/tbk-lernsituationen-uebungen/`

Damit der Workflow `.github/workflows/uebersicht.yml` zurückcommitten darf:
*Settings → Actions → General → Workflow permissions* → **Read and write permissions**.

## 3. Repo auf dem Server klonen

Als Benutzer `ctnutzerone`:

```bash
git clone https://github.com/CmoneBK/tbk-lernsituationen-uebungen.git \
  /home/users/ctnutzerone/git/tbk-lernsituationen-uebungen
```

Mehr ist nicht zu tun – `deploy.sh` erkennt das Repo am vorhandenen `.git`
und legt `/unterrichtsmaterial/` beim nächsten Lauf selbst an.

## 4. Geänderte `deploy.sh` ausrollen

Im Repo [tbk-webseite](https://github.com/CmoneBK/tbk-webseite) sind bereits
vorbereitet:

* `deploy.sh` – neuer Schritt 3 spiegelt dieses Repo nach `/unterrichtsmaterial/`
* `public/index.html` – die Kachel „Unterrichtsmaterial“ ist jetzt ein Link
  statt „in Vorbereitung“

Committen und pushen:

```bash
cd "K:/OneDrive/Webseiten/TBK"
git add deploy.sh public/index.html
git commit -m "Unterrichtsmaterial-Repo nach /unterrichtsmaterial/ ausspielen"
git push
```

`deploy.sh` aktualisiert sich beim nächsten Cron-Lauf selbst und startet dann
mit der neuen Fassung neu (`TBK_REEXEC`), der neue Bereich ist also
spätestens einen Lauf später online.

## 5. Kontrolle

```bash
runuser -u ctnutzerone -- bash /home/users/ctnutzerone/git/tbk-webseite/deploy.sh
```

Die Ausgabezeile nennt jetzt fünf Stände:

```
2026-09-12 08:00:00 deployed site=… werkzeuge=… material=… valis=… eplan=…
```

Danach muss `https://t-bk.de/unterrichtsmaterial/` die Übersicht zeigen und die
Startseite die Kachel verlinken.

## Was der Server nicht bekommt

`rsync` lässt beim Spiegeln aus: `.git/`, `.github/`, `.claude/`, `build/`,
`vorlagen/`, `README.md`, `DEPLOYMENT.md`, `package.json`. Auf dem Server liegt
also nur das, was ausgeliefert werden soll – inklusive `assets/`, `daten/` und
der fertigen `index.html`.
