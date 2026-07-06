import type { ThreatLevel } from './types';

export const colors = {
  bg: '#05080f',
  panel: '#0b1220',
  panelBorder: '#1c2a42',
  card: '#101a2e',
  text: '#dbe6f5',
  dim: '#6b7a94',
  accent: '#37e0d8',
  accentDark: '#0f6f6a',
  danger: '#ff3b5c',
  warning: '#ffb02e',
  violet: '#a06bff',
  toxic: '#7dff5a',
  shield: '#4da3ff',
  route: '#37e0d8',
};

/** Zonenfarbe nach Bedrohungsstufe – von toxisch-grün bis tiefrot/violett */
export function threatColor(threat: ThreatLevel): string {
  switch (threat) {
    case 1:
      return '#7dff5a';
    case 2:
      return '#d4e830';
    case 3:
      return '#ff8c2e';
    case 4:
      return '#ff3b5c';
    case 5:
      return '#a06bff';
  }
}

export function threatFill(threat: ThreatLevel): string {
  switch (threat) {
    case 1:
      return 'rgba(125,255,90,0.18)';
    case 2:
      return 'rgba(212,232,48,0.18)';
    case 3:
      return 'rgba(255,140,46,0.22)';
    case 4:
      return 'rgba(255,59,92,0.26)';
    case 5:
      return 'rgba(160,107,255,0.30)';
  }
}

export function threatLabel(threat: ThreatLevel): string {
  switch (threat) {
    case 1:
      return 'Gering';
    case 2:
      return 'Erhöht';
    case 3:
      return 'Hoch';
    case 4:
      return 'Kritisch';
    case 5:
      return 'Apokalyptisch';
  }
}
