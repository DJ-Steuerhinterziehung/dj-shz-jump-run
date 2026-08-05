# T-POSE TURBO: UP! RUN

Statische, installierbare Web-App mit Jump-and-Run und Spotify-Artist-Player.

## Lokal starten

Die PWA-Funktionen benötigen `localhost` oder HTTPS. Deshalb nicht nur die HTML-Datei doppelklicken,
sondern im Projektordner einen lokalen Webserver starten, zum Beispiel:

```powershell
python -m http.server 4173
```

Danach `http://127.0.0.1:4173/` öffnen.

## Steuerung

- `Leertaste`, `Pfeil hoch`, `W` oder Tippen: springen
- `P`: Pause
- `R`: neuen Run starten
- `F`: Vollbild ein- oder ausschalten
- Im Vollbild kann die gesamte Spielfläche angetippt werden

## Website veröffentlichen

Das Projekt braucht keinen Build-Schritt. Der komplette Ordner kann auf einen statischen HTTPS-Host
wie GitHub Pages, Netlify, Cloudflare Pages oder Vercel geladen werden. Wichtig: `index.html`,
`manifest.webmanifest`, `service-worker.js` und der Ordner `assets` müssen gemeinsam veröffentlicht werden.

## Installation als Web-App

Nach der Veröffentlichung über HTTPS erscheint in unterstützten Browsern die Schaltfläche
„App installieren“. Das Spiel und die lokalen Bilder werden für den Offline-Betrieb gespeichert.
Der Spotify-Player benötigt weiterhin eine Internetverbindung.

## Play Store

Der einfachste Weg für dieses Projekt ist eine Trusted Web Activity (TWA):

1. Website unter einer eigenen HTTPS-Adresse veröffentlichen.
2. Die URL mit PWABuilder oder Bubblewrap als Android-Paket verpacken.
3. Paketnamen und Signierschlüssel festlegen.
4. Die erzeugte `assetlinks.json` unter `/.well-known/assetlinks.json` auf derselben Website ablegen.
5. Das signierte Android App Bundle im Google Play Console-Konto hochladen.
6. Store-Eintrag, Screenshots, Datenschutzangaben und Altersfreigabe ausfüllen.

Die PWA-Grundlagen für Schritt 1 und 2 sind bereits enthalten.

## Spotify

Die Seite bindet das öffentliche Künstlerprofil von DJ Steuerhinterziehung ein. Der Artist-Player
aktualisiert die Top-Tracks direkt über Spotify; API-Schlüssel oder Login-Daten liegen nicht im Projekt.
