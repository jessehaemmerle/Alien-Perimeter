import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { FALLBACK_POS } from '../constants';
import { colors, threatColor, threatFill } from '../theme';
import type { LatLng } from '../types';
import { zoneIcon, type TacticalMapProps } from './TacticalMap.types';

const toLL = (p: LatLng): L.LatLngTuple => [p.latitude, p.longitude];

function dotIcon(color: string, sizePx: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${sizePx}px;height:${sizePx}px;border-radius:50%;background:${color};border:3px solid #03110f;box-shadow:0 0 10px ${color}"></div>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
  });
}

function emojiIcon(emoji: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:22px;line-height:24px;text-align:center;filter:drop-shadow(0 0 4px #000)">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/** Web/PWA-Einsatzkarte auf Basis von Leaflet mit dunklen CARTO-Tiles */
export default function TacticalMap({
  zones,
  cleared,
  route,
  simPos,
  playerPos,
  selectedZoneId,
  focus,
  nowMs,
  onZonePress,
}: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const zonesLayer = useRef<L.LayerGroup | null>(null);
  const clearedLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const unitsLayer = useRef<L.LayerGroup | null>(null);

  // Karte einmalig initialisieren
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: toLL(playerPos ?? FALLBACK_POS),
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    zonesLayer.current = L.layerGroup().addTo(map);
    clearedLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    unitsLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Container hat erst nach dem Layout seine endgültige Größe
    setTimeout(() => map.invalidateSize(), 0);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invasionszonen zeichnen
  useEffect(() => {
    const layer = zonesLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const zone of zones) {
      if (zone.kind === 'mothership') {
        L.circle(toLL(zone.center), {
          radius: zone.radiusM * 1.6,
          color: 'rgba(160,107,255,0.35)',
          fillColor: 'rgba(20,8,40,0.6)',
          fillOpacity: 0.25,
          weight: 1,
        }).addTo(layer);
      }
      L.polygon(zone.polygon.map(toLL), {
        color: threatColor(zone.threat),
        weight: selectedZoneId === zone.id ? 3 : 1.5,
        fillColor: threatColor(zone.threat),
        fillOpacity: parseFloat(threatFill(zone.threat).split(',')[3]) || 0.2,
      })
        .on('click', () => onZonePress(zone.id))
        .addTo(layer);
      L.marker(toLL(zone.center), { icon: emojiIcon(zoneIcon(zone.kind)) })
        .on('click', () => onZonePress(zone.id))
        .addTo(layer);
    }
  }, [zones, selectedZoneId, onZonePress]);

  // Befreite Gebiete
  useEffect(() => {
    const layer = clearedLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const area of cleared) {
      const shielded = !!area.shieldUntilMs && area.shieldUntilMs > nowMs;
      L.circle(toLL(area.center), {
        radius: area.radiusM,
        color: shielded ? colors.shield : 'rgba(125,255,90,0.5)',
        fillColor: shielded ? 'rgba(77,163,255,1)' : 'rgba(125,255,90,1)',
        fillOpacity: shielded ? 0.12 : 0.08,
        weight: 2,
      }).addTo(layer);
    }
  }, [cleared, nowMs]);

  // Aufgezeichnete Route
  useEffect(() => {
    const layer = routeLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (route.length > 1) {
      L.polyline(route.map(toLL), { color: colors.route, weight: 4 }).addTo(layer);
    }
  }, [route]);

  // Spieler- und Simulationsposition
  useEffect(() => {
    const layer = unitsLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (playerPos && !simPos) {
      L.marker(toLL(playerPos), { icon: dotIcon(colors.shield, 14) }).addTo(layer);
    }
    if (simPos) {
      L.marker(toLL(simPos), { icon: dotIcon(colors.accent, 16) }).addTo(layer);
    }
  }, [playerPos, simPos]);

  // Kamerafokus
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.fitBounds(L.latLng(toLL(focus.center)).toBounds(focus.radiusM * 4), { animate: true });
  }, [focus]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#05080f' }} />
    </View>
  );
}
