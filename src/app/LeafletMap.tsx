/* Client-only Leaflet map */
"use client";
import React, { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { LatLngExpression } from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

export type MapPoint = {
  coords: LatLngExpression;
  label?: string;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  timeRangeText?: string;
  durationText?: string;
  type?: "visit" | "activity";
  activityType?: string;
};

type Props = {
  center: LatLngExpression;
  focusPoint?: LatLngExpression;
  points: MapPoint[];
};

export default function LeafletMap({ center, focusPoint, points }: Props) {
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
      maxZoom={18}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
    >
      <AutoCenter target={focusPoint} />
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
      />
      {points.length > 0 && (
        <>
          <Polyline
            positions={points.map((p) => p.coords)}
            color="#1d4ed8"
            weight={4}
          />
          {points.map((p, idx) => (
            <Marker key={idx} position={p.coords}>
              <Popup>
                <div className="popup-title">
                  #{idx + 1} {p.label ? `- ${p.label}` : ""}
                </div>
                {p.timeRangeText && <div>{p.timeRangeText}</div>}
                {p.durationText && (
                  <div>
                    {p.type === "activity"
                      ? `移動 ${p.durationText}`
                      : `滞在 ${p.durationText}`}
                  </div>
                )}
              </Popup>
            </Marker>
          ))}
          {focusPoint && (
            <CircleMarker
              center={focusPoint}
              radius={10}
              pathOptions={{
                color: "#f97316",
                fillColor: "#fb923c",
                fillOpacity: 0.6,
                weight: 3,
              }}
            />
          )}
        </>
      )}
    </MapContainer>
  );
}

function AutoCenter({ target }: { target?: LatLngExpression }): null {
  const map = useMap();
  useEffect(() => {
    if (target) {
      const maxZoom = map.getMaxZoom() || map.getZoom();
      map.flyTo(target, maxZoom);
    }
  }, [target, map]);
  return null;
}
