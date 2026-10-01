export function StormZipMap({
  zips,
}: {
  zips: { zip: string; city: string; lat: number; lon: number; maxHailInches: number }[];
}) {
  const points = zips.filter((zip) => zip.lat && zip.lon);
  if (!points.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500">
        Add ZIPs with coordinates to plot the swath.
      </div>
    );
  }
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats) - 0.15;
  const maxLat = Math.max(...lats) + 0.15;
  const minLon = Math.min(...lons) - 0.15;
  const maxLon = Math.max(...lons) + 0.15;
  const width = 640;
  const height = 360;
  const x = (lon: number) => ((lon - minLon) / (maxLon - minLon || 1)) * width;
  const y = (lat: number) => ((maxLat - lat) / (maxLat - minLat || 1)) * height;
  const peak = Math.max(...points.map((p) => p.maxHailInches));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full rounded-xl bg-[#0a1628]"
      role="img"
      aria-label="Affected ZIP map"
    >
      <rect width={width} height={height} fill="#0a1628" />
      {points.map((zip) => {
        const heat = zip.maxHailInches / (peak || 1);
        return (
          <g key={zip.zip}>
            <circle
              cx={x(zip.lon)}
              cy={y(zip.lat)}
              r={5 + heat * 6}
              fill={heat > 0.75 ? "#dc2626" : heat > 0.45 ? "#f97316" : "#3b82f6"}
              fillOpacity={0.85}
              aria-label={`${zip.city} ${zip.zip}, ${zip.maxHailInches.toFixed(2)} inch hail`}
            />
          </g>
        );
      })}
    </svg>
  );
}
