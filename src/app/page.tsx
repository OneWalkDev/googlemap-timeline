"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { LatLngExpression } from "leaflet";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ja";

dayjs.locale("ja");

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const availableDates = useMemo(
    () => new Set(entries.map((e) => e.date)),
    [entries]
  );

  const HighlightedDay = useMemo(() => {
    function HighlightedDayComponent(dayProps: PickersDayProps): JSX.Element {
      const dateStr = dayjs(dayProps.day as any).format("YYYY-MM-DD");
      const isAvailable = availableDates.has(dateStr);
      return (
        <PickersDay
          {...dayProps}
          sx={{
            ...(isAvailable && !dayProps.selected
              ? {
                  bgcolor: "#e0f2fe",
                  color: "#0f172a",
                  "&:hover": { bgcolor: "#bae6fd" },
                }
              : {}),
          }}
        />
      );
    }
    return HighlightedDayComponent;
  }, [availableDates]);

  const filteredPoints = useMemo<LatLngExpression[]>(() => {
    if (!selectedDate) return [];
    const day = selectedDate.format("YYYY-MM-DD");
    return entries
      .filter((e) => e.date === day)
      .flatMap((e) => e.points);
  }, [entries, selectedDate]);

  const center = useMemo<LatLngExpression>(() => {
    if (filteredPoints.length > 0) return filteredPoints[0];
    return [35.68, 139.76];
  }, [filteredPoints]);

  const firstPoint = filteredPoints[0];

  const handleFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as unknown;
        const extracted = extractEntries(json);
        setEntries(extracted);
        const firstDate = extracted.find((e) => e.date)?.date;
        if (firstDate) setSelectedDate(dayjs(firstDate));
        setStatus(`読み込み完了`);
      } catch (e) {
        console.error(e);
        setStatus("読み込み失敗: JSON を確認してください");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="row">
      <div className="col-3 sidebar">
        <div>
          <h1>GoogleMapTimeLineViewer</h1>
          <label className="file-label">
            ①位置情報 JSON を選択
            <input
              type="file"
              accept="application/json"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="w-[300px]"
            />
          </label>
          <div className="status">{status}</div>
        </div>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
          <StaticDatePicker
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            slots={{ day: HighlightedDay }}
            displayStaticWrapperAs="mobile"
            slotProps={{
              toolbar: { toolbarFormat: "YYYY年M月D日" },
            }}
          />
        </LocalizationProvider>
      </div>
      <div className="col-9 map-wrap">
        {isClient ? (
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <AutoCenter target={firstPoint} />
            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredPoints.length > 0 && (
              <>
                <Polyline positions={filteredPoints} color="#1d4ed8" weight={4} />
                {filteredPoints.map((p, idx) => (
                  <Marker key={idx} position={p}>
                    <Popup>#{idx + 1}</Popup>
                  </Marker>
                ))}
              </>
            )}
          </MapContainer>
        ) : (
          <div className="map-placeholder">地図を読み込み中...</div>
        )}
      </div>
    </div>
  );
}

type Entry = {
  date: string;
  points: LatLngExpression[];
};

function extractEntries(data: unknown): Entry[] {
  if (!Array.isArray(data)) return [];

  const entries = data
    .map((item) => {
      const startTime = (item as any)?.startTime as string | undefined;
      const act = (item as any)?.activity;
      const visit = (item as any)?.visit;

      const points: (LatLngExpression | null)[] = [];
      if (act?.start) points.push(parseGeo(act.start));
      if (act?.end) points.push(parseGeo(act.end));
      if (visit?.topCandidate?.placeLocation) {
        points.push(parseGeo(visit.topCandidate.placeLocation));
      }

      const date = startTime ? dayjs(startTime).format("YYYY-MM-DD") : undefined;

      if (!date) return null;
      return {
        date,
        points: points.filter((p): p is LatLngExpression => !!p),
      };
    })
    .filter((e): e is Entry => !!e && e.points.length > 0);

  // sort by date (earlier first)
  entries.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  return entries;
}

function parseGeo(geo: unknown): LatLngExpression | null {
  if (typeof geo !== "string") return null;
  const match = geo.match(/geo:([0-9.+-]+),([0-9.+-]+)/i);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
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
