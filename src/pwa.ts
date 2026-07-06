import { Platform } from 'react-native';

function addMeta(name: string, content: string) {
  if (document.querySelector(`meta[name="${name}"]`)) return;
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

function addLink(rel: string, href: string) {
  if (document.querySelector(`link[rel="${rel}"]`)) return;
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}

/**
 * PWA-Setup für den Web-Build: Manifest, iOS-Homescreen-Metadaten,
 * Viewport für Notch-Geräte und Service-Worker-Registrierung.
 * Expo/Metro erzeugt das HTML zur Laufzeit aus dem Bundle, daher werden
 * die Head-Einträge hier programmatisch gesetzt.
 */
export function setupPwa(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.title = 'Alien Perimeter';
  // Relative Pfade, damit die PWA auch unter einem Basis-Pfad funktioniert
  // (z. B. GitHub Pages: /Alien-Perimeter/)
  addLink('manifest', 'manifest.webmanifest');
  addMeta('theme-color', '#0b1220');
  addMeta('description', 'Düsteres lokationsbasiertes PvE-Game: Kessle Alien-Zonen durch reale Bewegung ein und verteidige die Erde.');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  addMeta('apple-mobile-web-app-title', 'Alien Perimeter');
  addLink('apple-touch-icon', 'icons/apple-touch-icon.png');

  // Viewport für randlose Darstellung auf Notch-Geräten
  let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content =
    'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';

  // Dunkler Hintergrund hinter Safe-Areas, kein Pull-to-Refresh in der Karte
  const style = document.createElement('style');
  style.textContent =
    'html,body{background:#05080f;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}';
  document.head.appendChild(style);

  if (!__DEV__ && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Relativ registriert → Scope ist automatisch der Basis-Pfad
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Offline-Support ist optional – App funktioniert auch ohne SW
      });
    });
  }
}
