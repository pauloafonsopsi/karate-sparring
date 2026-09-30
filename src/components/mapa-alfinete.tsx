import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

import { Btn } from "@/components/kit";

const MapaAlfineteInner = lazy(() => import("@/components/mapa-alfinete-inner"));

export function MapaAlfinete({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function usarMinhaLocalizacao() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErro("Seu navegador não permite usar a localização.");
      return;
    }
    setErro(null);
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscando(false);
        onChange(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setBuscando(false);
        setErro("Não conseguimos pegar sua localização. Autorize o acesso e tente de novo.");
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  const marcado = latitude != null && longitude != null;

  return (
    <div className="space-y-3">
      <ClientOnly fallback={<div className="h-72 w-full border border-line bg-surface" />}>
        <Suspense fallback={<div className="h-72 w-full border border-line bg-surface" />}>
          <MapaAlfineteInner latitude={latitude} longitude={longitude} onChange={onChange} />
        </Suspense>
      </ClientOnly>
      <Btn full variant="outline" disabled={buscando} onClick={usarMinhaLocalizacao}>
        {buscando ? "Localizando" : "Estou no dojô, usar minha localização"}
      </Btn>
      <p className="text-xs text-muted-fg">
        {marcado
          ? "Alfinete marcado. Arraste-o no mapa para o ajuste fino da porta do dojô."
          : "Toque no mapa ou use sua localização para marcar a porta do dojô."}
      </p>
      {erro && <p className="text-xs text-brand">{erro}</p>}
    </div>
  );
}
