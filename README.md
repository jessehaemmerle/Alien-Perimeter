# Alien Perimeter

Alien Perimeter ist ein düsteres, lokationsbasiertes PvE-Mobile-Game: Die reale Welt wird zum
Schlachtfeld einer Alien-Invasion. Spieler kesseln befallene Gebiete ein, indem sie sie real
umrunden – zu Fuß, joggend, wandernd oder mit dem Rad. Das vollständige Konzept steht in
[`Spielidee.md`](./Spielidee.md).

Dieses Repository enthält die spielbare Mobile-App (Expo / React Native, TypeScript) – als
native App **und als installierbare PWA** fürs Smartphone aus derselben Codebasis.

## Features

- **Live-Karte im taktischen Dark-Style** mit dynamisch generierten Invasionszonen rund um die
  eigene Position: Alien-Nester 🕸️, Invasionscluster 👾, Invasionssektoren ☣️ und
  Mutterschiff-Bosszonen 🛸 (Bedrohungsstufen 1–5, instabile Zonen breiten sich aus)
- **GPS-Routenaufzeichnung & Einkesselung**: geschlossene Route, Mindestdistanz, Zonenabdeckung,
  maximale Routenabweichung, Geschwindigkeits-Plausibilität je Bewegungsart und
  GPS-Spoofing-Erkennung werden geprüft
- **Bewegungsarten** Gehen / Joggen / Wandern / Radfahren mit eigenen Tempo-Limits und XP-Boni
- **Mehrrunden-Zonen & Koop-Bosskämpfe**: große Zonen und Mutterschiffe brauchen mehrere
  Umrundungen; der Team-Booster ruft eine (simulierte) Einsatzgruppe mit Koop-Boni
- **Items & Power-ups**: Scanner, Signalverstärker, Schildgenerator, Orbitalmarkierung,
  Team-Booster, Routenverstärker, Notfall-Extraktion – als Drops aus neutralisierten Zonen
- **Fortschritt**: Level, XP, Titel (Nestbrecher, Mutterschiff-Jäger, …), Abzeichen,
  Einsatzstatistiken – lokal gespeichert (AsyncStorage)
- **Dynamische Angriffswellen**: alle 12 Minuten spawnen neue Zonen, ungeschützte befreite
  Gebiete können erneut befallen werden (Schildgenerator schützt 12 h)
- **Globales Verteidigungsnetz**: simulierte Weltstatistiken, Bedrohungsstufe, Regions-Ranking
  und Wellen-Countdown
- **Simulationsmodus**: ein virtueller Läufer umrundet die gewählte Zone automatisch – zum
  Testen des kompletten Spiel-Loops ohne echte Bewegung (auch ohne GPS-Berechtigung nutzbar)

## App starten

Voraussetzungen: Node.js ≥ 20 und die [Expo Go](https://expo.dev/go)-App am Smartphone
(oder ein Android-/iOS-Emulator).

```bash
npm install
npm start          # Expo Dev Server, QR-Code mit Expo Go scannen
npm run android    # direkt am Android-Gerät/-Emulator
npm run ios        # direkt am iOS-Simulator (macOS)
npm run web        # im Browser (Entwicklungsmodus)
```

## PWA am Smartphone

Die App läuft als vollwertige **Progressive Web App**: installierbar am Homescreen
(Android/Chrome „App installieren“, iOS/Safari „Zum Home-Bildschirm“), Vollbild ohne
Browser-UI, Offline-App-Shell und gecachte Karten-Tiles per Service Worker. Auf dem Web
ersetzt eine Leaflet-Karte mit dunklen CARTO/OpenStreetMap-Tiles die native Karte – ganz
ohne API-Key.

```bash
npm run build:web   # statischer PWA-Build nach dist/
npx serve dist      # lokal testen (oder beliebiger statischer Hoster)
```

### Automatisches Deployment auf GitHub Pages

Der Workflow [`deploy-pages.yml`](./.github/workflows/deploy-pages.yml) baut die PWA bei
jedem Push auf `main` (Typecheck + Tests + Export) und veröffentlicht sie auf GitHub Pages:

**https://jessehaemmerle.github.io/Alien-Perimeter/**

Diese URL am Smartphone öffnen und über „App installieren“ / „Zum Home-Bildschirm“
installieren – fertig. Der Workflow lässt sich auch manuell von jedem Branch starten
(Actions → *Deploy PWA to GitHub Pages* → *Run workflow*). Falls das automatische
Aktivieren von Pages an Berechtigungen scheitert, einmalig unter
*Settings → Pages → Source: „GitHub Actions“* freischalten.

Der Build läuft mit `EXPO_BASE_URL=/Alien-Perimeter` (siehe `app.config.js`), da Project
Pages unter einem Unterpfad liegen; Manifest, Icons und Service Worker verwenden dafür
relative bzw. Scope-basierte Pfade.

Wichtig: Die Browser-Geolocation funktioniert nur über HTTPS (oder `localhost`) – GitHub
Pages erfüllt das. Ohne GPS-Freigabe greift die Ausweichposition Wien, und der
**Simulationsmodus** bleibt voll spielbar.

Bausteine: `public/manifest.webmanifest` (Manifest), `public/sw.js` (Service Worker),
`public/icons/` (generierte Icons, `npm run icons`), `src/pwa.ts` (Registrierung +
Meta-Tags), `src/components/TacticalMap.web.tsx` (Leaflet-Karte).

Beim ersten Start fragt die App nach der Standort-Berechtigung und erzeugt Invasionszonen in
der Umgebung. Ohne GPS wird eine Ausweichposition (Wien) verwendet – dann einfach den
**Simulationsmodus** im Missions-Briefing aktivieren.

## Spielablauf

1. **Zone antippen** auf der Karte → Missions-Briefing mit Anforderungen (Mindestdistanz,
   Umrundungen, Belohnung)
2. **Bewegungsart wählen** und optional Ausrüstung aktivieren (z. B. Orbitalmarkierung zum
   Schwächen der Zone)
3. **Einsatz starten** und die Zone real umrunden – das HUD zeigt Distanz, Integrität und
   Warnungen live an
4. Bei gültigem Routenschluss wird die Runde automatisch gewertet; ist die Integrität auf 0,
   ist die Zone **neutralisiert**: XP, Item-Drops und ggf. neue Titel
5. Befreite Gebiete im Tab **Ausrüstung** mit dem Schildgenerator vor der nächsten
   Angriffswelle schützen

## Entwicklung

```bash
npm test           # Jest: Geo-/Spiellogik + End-to-End-Missionstest (28 Tests)
npm run typecheck  # TypeScript strict
```

Projektstruktur:

```
App.tsx                     Tab-Navigation, Welt-Tick, Hydration
src/logic/                  Reine Spiellogik (getestet)
  geo.ts                    Haversine, Point-in-Polygon, Zielpunkt-Berechnung
  encirclement.ts           Einkesselungs-Validierung + Rundenschaden
  zones.ts                  Zonengenerierung, instabile Ausbreitung
  progression.ts            XP/Level, Titel & Abzeichen
  items.ts                  Power-ups & Drop-Tabellen
  world.ts                  Angriffswellen-Takt & globale Statistik
  sim.ts                    Simulationsmodus (virtueller Läufer)
src/state/store.ts          Zustand-Store mit AsyncStorage-Persistenz
src/screens/                Karte, Welt, Ausrüstung, Profil
src/components/             Missions-Briefing, Missions-HUD, UI-Bausteine
  TacticalMap.tsx           Einsatzkarte nativ (react-native-maps)
  TacticalMap.web.tsx       Einsatzkarte Web/PWA (Leaflet)
src/pwa.ts                  PWA-Setup (Manifest, Meta-Tags, Service Worker)
public/                     PWA-Assets (Manifest, sw.js, Icons)
scripts/generate-icons.mjs  Icon-Generierung (npm run icons)
```

Hinweis: Für eigenständige Android-Builds (außerhalb von Expo Go) benötigt `react-native-maps`
einen Google-Maps-API-Key in `app.json`; in Expo Go funktioniert die Karte ohne weitere
Konfiguration.
