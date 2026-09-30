import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef } from "react";

const PADRAO: [number, number] = [-14.235, -51.9253];

const icone = L.divIcon({
  className: "",
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:#C8102E;box-shadow:0 0 0 4px rgba(200,16,46,.28)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function MapaAlfineteInner({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    const temPonto = latitude != null && longitude != null;
    const centro: [number, number] = temPonto ? [latitude, longitude] : PADRAO;

    const mapa = L.map(divRef.current, { attributionControl: true }).setView(
      centro,
      temPonto ? 17 : 4,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(mapa);

    if (temPonto) {
      markerRef.current = L.marker(centro, { icon: icone, draggable: true }).addTo(mapa);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
    }

    mapa.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon: icone, draggable: true }).addTo(mapa);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLatLng();
          onChangeRef.current(p.lat, p.lng);
        });
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }
      onChangeRef.current(lat, lng);
    });

    mapRef.current = mapa;
    return () => {
      mapa.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mapa = mapRef.current;
    if (!mapa || latitude == null || longitude == null) return;
    const destino: [number, number] = [latitude, longitude];
    if (markerRef.current) markerRef.current.setLatLng(destino);
    else {
      markerRef.current = L.marker(destino, { icon: icone, draggable: true }).addTo(mapa);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
    }
    if (mapa.getZoom() < 14) mapa.setView(destino, 17);
  }, [latitude, longitude]);

  return <div ref={divRef} className="h-72 w-full border border-line bg-surface" />;
}
