import type { ItemId, Zone } from '../types';
import type { Rng } from './rng';

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string;
  description: string;
  usage: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  scanner: {
    id: 'scanner',
    name: 'Scanner',
    icon: '📡',
    description: 'Zeigt versteckte Alien-Aktivität und kommende Angriffswellen in der Nähe an.',
    usage: 'Deckt beim Einsatz eine zusätzliche verborgene Zone in der Umgebung auf.',
  },
  signal: {
    id: 'signal',
    name: 'Signalverstärker',
    icon: '📶',
    description: 'Erhöht die Reichweite, mit der du an einer Zone teilnehmen kannst.',
    usage: 'Vor dem Einsatz aktivieren: großzügigere Toleranzen für Routenschluss und Abdeckung.',
  },
  shield: {
    id: 'shield',
    name: 'Schildgenerator',
    icon: '🛡️',
    description: 'Schützt ein befreites Gebiet für 12 Stunden vor erneutem Befall.',
    usage: 'Auf ein befreites Gebiet anwenden (Ausrüstung → Befreite Gebiete).',
  },
  orbital: {
    id: 'orbital',
    name: 'Orbitalmarkierung',
    icon: '🎯',
    description: 'Ein Orbitalschlag schwächt die Alien-Zone vor der Umrundung um 25 %.',
    usage: 'Vor dem Einsatz aktivieren: Zonen-Integrität sinkt sofort um 25 %.',
  },
  teamboost: {
    id: 'teamboost',
    name: 'Team-Booster',
    icon: '🤝',
    description: 'Ruft eine Einsatzgruppe des Widerstands zur Unterstützung.',
    usage: 'Vor dem Einsatz aktivieren: Verbündete verstärken Schaden und Belohnungen (+Koop-Bonus).',
  },
  routeboost: {
    id: 'routeboost',
    name: 'Routenverstärker',
    icon: '⚡',
    description: 'Verbessert die Wirkung einer abgeschlossenen Einkreisung um 50 %.',
    usage: 'Vor dem Einsatz aktivieren: jede gültige Runde verursacht mehr Schaden.',
  },
  extraction: {
    id: 'extraction',
    name: 'Notfall-Extraktion',
    icon: '🪂',
    description: 'Rettet einen Einsatz, wenn eine Route knapp ungültig wäre (z. B. GPS-Lücke).',
    usage: 'Im Einsatz einsetzen, wenn eine Runde knapp abgelehnt wurde.',
  },
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

/** Item-Drops nach einer neutralisierten Zone – skaliert mit Bedrohungsstufe */
export function rollDrops(zone: Zone, rng: Rng): ItemId[] {
  const drops: ItemId[] = [];
  const pool: ItemId[] = ['scanner', 'signal', 'shield', 'orbital', 'teamboost', 'routeboost', 'extraction'];
  const chance = 0.35 + zone.threat * 0.12;
  const rolls = zone.kind === 'mothership' ? 3 : zone.kind === 'sector' ? 2 : 1;
  for (let i = 0; i < rolls; i++) {
    if (rng() < chance) {
      drops.push(pool[Math.floor(rng() * pool.length)]);
    }
  }
  if (zone.kind === 'mothership' && drops.length === 0) {
    drops.push('shield');
  }
  return drops;
}
