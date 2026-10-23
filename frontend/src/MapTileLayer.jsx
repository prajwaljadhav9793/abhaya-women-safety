import { useState } from "react";
import { TileLayer } from "react-leaflet";
import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_FALLBACK_ATTRIBUTION,
  MAP_TILE_FALLBACK_URL,
  MAP_TILE_URL
} from "./mapTiles.js";

export default function MapTileLayer() {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <TileLayer
      key={useFallback ? "fallback" : "primary"}
      attribution={useFallback ? MAP_TILE_FALLBACK_ATTRIBUTION : MAP_TILE_ATTRIBUTION}
      url={useFallback ? MAP_TILE_FALLBACK_URL : MAP_TILE_URL}
      eventHandlers={{
        tileerror: () => setUseFallback(true)
      }}
    />
  );
}
