import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline } from 'react-native-maps';
import { FALLBACK_POS } from '../constants';
import { darkMapStyle } from '../data/mapStyle';
import { colors, threatColor, threatFill } from '../theme';
import { zoneIcon, type TacticalMapProps } from './TacticalMap.types';

/** Native Einsatzkarte auf Basis von react-native-maps */
export default function TacticalMap({
  zones,
  cleared,
  route,
  simPos,
  playerPos,
  selectedZoneId,
  showUserLocation,
  focus,
  nowMs,
  onZonePress,
}: TacticalMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (focus && mapRef.current) {
      const delta = Math.max(0.008, (focus.radiusM / 111_000) * 4);
      mapRef.current.animateToRegion(
        { ...focus.center, latitudeDelta: delta, longitudeDelta: delta },
        600
      );
    }
  }, [focus]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{
        ...(playerPos ?? FALLBACK_POS),
        latitudeDelta: 0.045,
        longitudeDelta: 0.045,
      }}
      customMapStyle={darkMapStyle}
      showsUserLocation={showUserLocation}
      showsMyLocationButton
      toolbarEnabled={false}
    >
      {zones.map((zone) => (
        <React.Fragment key={zone.id}>
          <Polygon
            coordinates={zone.polygon}
            strokeColor={threatColor(zone.threat)}
            fillColor={threatFill(zone.threat)}
            strokeWidth={selectedZoneId === zone.id ? 3 : 1.5}
            tappable
            onPress={() => onZonePress(zone.id)}
          />
          {zone.kind === 'mothership' && (
            <Circle
              center={zone.center}
              radius={zone.radiusM * 1.6}
              strokeColor="rgba(160,107,255,0.35)"
              fillColor="rgba(20,8,40,0.25)"
            />
          )}
          <Marker
            coordinate={zone.center}
            onPress={() => onZonePress(zone.id)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <Text style={styles.zoneEmoji}>{zoneIcon(zone.kind)}</Text>
          </Marker>
        </React.Fragment>
      ))}

      {cleared.map((area) => {
        const shielded = !!area.shieldUntilMs && area.shieldUntilMs > nowMs;
        return (
          <Circle
            key={area.id}
            center={area.center}
            radius={area.radiusM}
            strokeColor={shielded ? colors.shield : 'rgba(125,255,90,0.5)'}
            fillColor={shielded ? 'rgba(77,163,255,0.12)' : 'rgba(125,255,90,0.08)'}
          />
        );
      })}

      {route.length > 1 && (
        <Polyline coordinates={route} strokeColor={colors.route} strokeWidth={4} />
      )}

      {simPos && (
        <Marker coordinate={simPos} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.simDot} />
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  zoneEmoji: { fontSize: 22 },
  simDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#03110f',
  },
});
