"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { StaticDatePicker } from "@mui/x-date-pickers";
import { PickersDay, PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/ja";
import type { MapPoint } from "./LeafletMap";

dayjs.locale("ja");

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder">地図を読み込み中...</div>,
});

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [status, setStatus] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [focusedPoint, setFocusedPoint] = useState<[number, number] | null>(
    null
  );

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

  const filteredPoints = useMemo<MapPoint[]>(() => {
    if (!selectedDate) return [];
    const day = selectedDate.format("YYYY-MM-DD");
    return entries
      .filter((e) => e.date === day)
      .flatMap((e) => e.points);
  }, [entries, selectedDate]);

  const { visitCount, activityCount } = useMemo(() => {
    const visitCount = filteredPoints.filter((p) => p.type === "visit").length;
    const activityCount = filteredPoints.filter(
      (p) => p.type === "activity"
    ).length;
    return { visitCount, activityCount };
  }, [filteredPoints]);

  const center = useMemo<[number, number]>(() => {
    if (filteredPoints.length > 0)
      return normalizePoint(filteredPoints[0].coords);
    return [35.68, 139.76];
  }, [filteredPoints]);

  useEffect(() => {
    if (filteredPoints.length > 0) {
      // Always focus the first point for a freshly selected date
      setFocusedPoint(normalizePoint(filteredPoints[0].coords));
    } else {
      setFocusedPoint(null);
    }
  }, [filteredPoints]);

  const focusOnPoint = (point: MapPoint) => {
    setFocusedPoint(normalizePoint(point.coords));
  };

  const activeDateLabel = selectedDate
    ? selectedDate.format("YYYY年M月D日 (ddd)")
    : "日付を選択";

  const pointCountLabel =
    filteredPoints.length > 0
      ? `${filteredPoints.length}地点`
      : "地点リストなし";

  const handleFile = (file?: File | null) => {
    if (!file) return;
    setFileName(file.name);
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

  // Avoid hydration mismatch by rendering after mount
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="row app-shell">
        <div className="col-3 sidebar">
          <h1 className="sidebar-title">GoogleMapTimeLineViewer</h1>
          <div className="status">読み込み中...</div>
        </div>
        <div className="col-9 map-wrap">
          <div className="map-placeholder">地図を読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="glow glow-1" />
      <div className="glow glow-2" />
      <div className="row">
        <div className={`col-3 sidebar ${menuOpen ? "open" : ""}`}>
          <header className="sidebar-header">
            <div>
              <h1 className="sidebar-title">GoogleMapTimeLineViewer</h1>
              <p className="subtitle">
                Google Mapのタイムラインデータを読み込み、訪問/移動履歴を1日にまとめて振り返ります。
              </p>
            </div>
          </header>

          <div className="card">
            <div className="card-heading">
              <span className="chip-outline">STEP 1</span>
              <h2>位置情報 JSON を読み込む</h2>
            </div>
            <p className="card-desc">
              スマートフォンの Google Map →「設定」→「位置情報とプライバシー」
              →「タイムラインデータをエクスポート」でダウンロードした
              location-history.json を選択してください。
            </p>
            <label className="upload-control" htmlFor="location-file">
              <input
                id="location-file"
                type="file"
                accept="application/json"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="upload-text">
                <span className="upload-button">
                  {fileName ? "選択済み" : "ファイルを選択"}
                </span>
                <span className="upload-hint">
                  {fileName ?? "ドラッグ＆ドロップも可能です"}
                </span>
              </div>
            </label>
          </div>

          <div className="card calendar-card">
            <div className="card-heading">
              <span className="chip-outline">STEP 2</span>
              <h2>日付を選択</h2>
            </div>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
              <div className="picker-wrap">
                <StaticDatePicker
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  slots={{ day: HighlightedDay }}
                  displayStaticWrapperAs="mobile"
                  slotProps={{
                    toolbar: { toolbarFormat: "YYYY年M月D日" },
                    layout: { sx: { width: "100%", minWidth: 0 } },
                    actionBar: { actions: [] },
                  }}
                />
              </div>
            </LocalizationProvider>
          </div>

          <div className="card points-card">
            <div className="card-heading">
              <span className="chip-outline">STEP 3</span>
              <h2>行った場所</h2>
              <span className="chip-ghost">{pointCountLabel}</span>
            </div>
            <div className="points-list mt-3">
              {filteredPoints.length === 0 ? (
                <p className="points-empty">
                  {selectedDate
                    ? "選択した日に地点がありません"
                    : "日付を選択してください"}
                </p>
              ) : (
                filteredPoints.map((point, idx) => {
                  const tuple = normalizePoint(point.coords);
                  const isActive =
                    focusedPoint && areSamePoint(tuple, focusedPoint);
                  const title =
                    point.label ??
                    (point.type === "visit" ? "訪問地点" : "移動ポイント");
                  return (
                    <button
                      key={`${tuple[0]}-${tuple[1]}-${idx}`}
                      type="button"
                      className={`point-item ${isActive ? "active" : ""}`}
                      onClick={() => focusOnPoint(point)}
                    >
                      <span className="point-label">#{idx + 1}</span>
                      <div className="point-content">
                        <div className="point-title">
                          {title}
                          {point.type && (
                            <span className={`point-chip ${point.type}`}>
                              {point.type === "visit" ? "訪問" : "移動"}
                            </span>
                          )}
                        </div>
                        <div className="point-meta">
                          <span>
                            {point.timeRangeText ?? "時間情報なし"}
                          </span>
                          {point.durationText && (
                            <span className="point-duration">
                              {point.type === "activity"
                                ? `移動 ${point.durationText}`
                                : `滞在 ${point.durationText}`}
                            </span>
                          )}
                        </div>
                        <span className="point-coords">
                          {tuple[0].toFixed(5)}, {tuple[1].toFixed(5)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div className="col-9 map-wrap">
          <div className="map-panel">
            <div>
              <p className="eyebrow">選択中の日付</p>
              <div className="map-title">{activeDateLabel}</div>
            </div>
            <div className="map-actions">
              <div className="map-stats">
                <span className="status-chip strong">
                  地点 {filteredPoints.length}
                </span>
                <span className="status-chip">
                  訪問 {visitCount} / 移動 {activityCount}
                </span>
              </div>
              <button
                className="menu-toggle"
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
              >
                メニュー
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="backdrop" onClick={() => setMenuOpen(false)} />
          )}
          <LeafletMap
            center={center}
            focusPoint={focusedPoint ?? undefined}
            points={filteredPoints}
          />
        </div>
      </div>
    </div>
  );
}

type Entry = {
  date: string;
  points: MapPoint[];
};

function extractEntries(data: unknown): Entry[] {
  if (!Array.isArray(data)) return [];

  const entries = data
    .map((item) => {
      const startTime = (item as any)?.startTime as string | undefined;
      const endTime = (item as any)?.endTime as string | undefined;
      const act = (item as any)?.activity;
      const visit = (item as any)?.visit;
      const activityLabel = activityLabelFromType(act?.topCandidate?.type);

      let points: MapPoint[] = [];
      const dateSource = startTime ?? endTime;
      const date = dateSource
        ? dayjs(dateSource).format("YYYY-MM-DD")
        : undefined;
      const timeInfo = buildTimeInfo(startTime, endTime);

      if (act?.start) {
        const coords = parseGeo(act.start);
        if (coords)
          points.push({
            coords,
            type: "activity",
            label: activityLabel ?? "移動",
            activityType: act?.topCandidate?.type,
            ...timeInfo,
          });
      }
      if (act?.end) {
        const coords = parseGeo(act.end);
        if (coords)
          points.push({
            coords,
            type: "activity",
            label: activityLabel ?? "移動",
            activityType: act?.topCandidate?.type,
            ...timeInfo,
          });
      }
      if (visit?.topCandidate?.placeLocation) {
        const coords = parseGeo(visit.topCandidate.placeLocation);
        if (coords) {
          points.push({
            coords,
            label: visit.topCandidate.name ?? visit.topCandidate.address,
            type: "visit",
            ...timeInfo,
          });
        }
      }

      if (!date || points.length === 0) return null;
      return { date, points };
    })
    .filter((e): e is Entry => !!e && e.points.length > 0);

  // sort by date (earlier first)
  entries.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  return entries;
}

function parseGeo(geo: unknown): [number, number] | null {
  if (typeof geo !== "string") return null;
  const match = geo.match(/geo:([0-9.+-]+),([0-9.+-]+)/i);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return [lat, lng];
}

function normalizePoint(point: MapPoint["coords"]): [number, number] {
  if (Array.isArray(point)) {
    const [lat, lng] = point as [number, number];
    return [lat, lng];
  }
  if (typeof point === "object" && point !== null) {
    const anyPoint = point as any;
    if (typeof anyPoint.lat === "number" && typeof anyPoint.lng === "number") {
      return [anyPoint.lat, anyPoint.lng];
    }
  }
  return [0, 0];
}

function areSamePoint(
  a: [number, number],
  b: [number, number]
): boolean {
  return (
    Math.abs(a[0] - b[0]) < 1e-9 &&
    Math.abs(a[1] - b[1]) < 1e-9
  );
}

function buildTimeInfo(startTime?: string, endTime?: string) {
  const start = startTime ? dayjs(startTime) : null;
  const end = endTime ? dayjs(endTime) : null;

  const timeRangeText =
    start && start.isValid()
      ? `${start.format("HH:mm")}${
          end && end.isValid() ? ` - ${end.format("HH:mm")}` : ""
        }`
      : undefined;

  const durationMs =
    start && start.isValid() && end && end.isValid()
      ? Math.max(end.diff(start), 0)
      : undefined;
  const durationText =
    durationMs !== undefined ? formatDuration(durationMs) : undefined;

  return {
    startTime,
    endTime,
    timeRangeText,
    durationMs,
    durationText,
  };
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60000);
  if (totalMinutes <= 0) return "1分未満";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
  if (hours > 0) return `${hours}時間`;
  return `${minutes}分`;
}

function activityLabelFromType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase();
  const map: Record<string, string> = {
    walking: "徒歩",
    "in subway": "地下鉄",
    "in passenger vehicle": "車",
    "in bus": "バス",
    "in train": "電車",
    cycling: "自転車",
    motorcycling: "バイク",
    flying: "飛行機",
    unknown: "不明",
  };
  return map[key] ?? raw;
}
