/* Client-only Leaflet map */
"use client";
import React, { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngExpression } from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

type Props = {
  center: LatLngExpression;
  firstPoint?: LatLngExpression;
  points: LatLngExpression[];
};

export default function LeafletMap({ center, firstPoint, points }: Props) {
  useEffect(() => {
    const iconPath = (path: unknown) =>
      typeof path === "string" ? path : (path as any)?.src || "";
    const defaultIcon = new L.Icon({
      iconRetinaUrl: iconPath(iconRetinaUrl),
      iconUrl: iconPath(iconUrl),
      shadowUrl: iconPath(shadowUrl),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <AutoCenter target={firstPoint} />
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.length > 0 && (
        <>
          <Polyline positions={points} color="#1d4ed8" weight={4} />
          {points.map((p, idx) => (
            <Marker key={idx} position={p}>
              <Popup>#{idx + 1}</Popup>
            </Marker>
          ))}
        </>
      )}
    </MapContainer>
  );
}

function AutoCenter({ target }: { target?: LatLngExpression }): null {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, map.getZoom());
    }
  }, [target, map]);
  return null;
}
