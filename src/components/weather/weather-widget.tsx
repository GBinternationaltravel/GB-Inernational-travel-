import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { WeatherForecast } from "@/types/weather";

export function WeatherWidget({
  forecast,
  compact = false,
}: {
  forecast: WeatherForecast | null;
  compact?: boolean;
}) {
  if (!forecast) {
    return (
      <Alert variant="info" title="Weather unavailable">
        No weather snapshot is available for this location yet.
      </Alert>
    );
  }

  const temperature =
    forecast.current.temperature ?? forecast.current.temperatureC;
  const feelsLike = forecast.current.feelsLike ?? forecast.current.feelsLikeC;
  const humidity = forecast.current.humidity;
  const wind = forecast.current.wind ?? forecast.current.windKph;
  const lastUpdated =
    forecast.current.lastUpdated ?? forecast.current.observedAt;
  const high =
    forecast.current.highC ?? forecast.daily[0]?.highC ?? temperature;
  const low = forecast.current.lowC ?? forecast.daily[0]?.lowC ?? temperature;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold text-[var(--color-navy)]">
            {forecast.locationName} weather
          </h3>
          <p className="mt-1 text-sm text-[var(--color-sky)]">{forecast.current.condition}</p>
        </div>
        <Badge variant={forecast.isMock ? "warning" : "info"}>
          {forecast.isMock
            ? forecast.dataLabel || "Demo Weather Data"
            : forecast.dataLabel || "Live weather"}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <p className="text-4xl font-bold tracking-tight text-[var(--color-navy)]">
          {temperature}°C
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--color-muted)]">Feels like</dt>
            <dd className="font-semibold">{feelsLike}°C</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Humidity</dt>
            <dd className="font-semibold">{humidity}%</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Wind</dt>
            <dd className="font-semibold">{wind} km/h</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">High</dt>
            <dd className="font-semibold">{high}°C</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Low</dt>
            <dd className="font-semibold">{low}°C</dd>
          </div>
          <div>
            <dt className="text-[var(--color-muted)]">Updated</dt>
            <dd className="font-semibold">
              {new Date(lastUpdated).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      {!compact ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">{forecast.travelSummary}</p>
      ) : null}

      {forecast.isMock ? (
        <p className="mt-3 text-xs font-medium text-[var(--color-warning)]">
          Demo Weather Data — not live meteorological information.
        </p>
      ) : null}
    </div>
  );
}
