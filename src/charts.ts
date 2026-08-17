import countriesAtlasJson from 'world-atlas/countries-110m.json'
import { areaY, createMark, defineChart, lineY } from '@tanstack/charts'
import { brushX } from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { zoomX } from '@tanstack/charts/interaction/zoom'
import { decorative } from '@tanstack/charts/mark/decorative'
import { geoShape } from '@tanstack/charts/geo'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { tooltip } from '@tanstack/charts/tooltip'
import { geoOrthographic } from 'd3-geo'
import { scaleLinear, scaleOrdinal, scaleQuantize, scaleUtc } from 'd3-scale'
import { feature } from 'topojson-client'
import type { ExtendedFeature, GeoGeometryObjects } from 'd3-geo'
import type {
  BrushRange,
  BrushXChange,
} from '@tanstack/charts/interaction/brush'
import type {
  ZoomXChange,
  ZoomXWindow,
} from '@tanstack/charts/interaction/zoom'
import type { SceneNode } from '@tanstack/charts'

export interface MetricPoint {
  readonly time: Date
  readonly value: number
}

interface Segment {
  readonly label: string
  readonly value: number
}

interface RadarPoint extends MetricPoint {
  readonly series: 'Total bytes' | 'HTTP bytes' | 'Previous 7 days'
}

type CountryGeometry = Extract<
  GeoGeometryObjects,
  { type: 'Polygon' | 'MultiPolygon' }
>

interface CountryProperties {
  readonly name: string
  readonly traffic: number
}

type CountryFeature = ExtendedFeature<CountryGeometry, CountryProperties>

export type DashboardInterval =
  'Auto' | '5 minutes' | '15 minutes' | '1 hour' | '1 day'

export interface RadarSeriesVisibility {
  readonly total: boolean
  readonly http: boolean
  readonly previous: boolean
}

export type TrafficViewportWindow = ZoomXWindow<Date>

const dashboardBlue = '#0051c3'
const radarBlue = '#0055b8'
const radarCyan = '#00a7c7'
const radarPrevious = '#929aa5'
const dashboardStart = Date.UTC(2026, 7, 11, 15)
const radarStart = Date.UTC(2026, 7, 5)

type AtlasTopology = Parameters<typeof feature>[0]
const countriesTopology = countriesAtlasJson as unknown as AtlasTopology
const countriesObject = countriesTopology.objects.countries
const convertedCountries = countriesObject
  ? feature(countriesTopology, countriesObject)
  : null

const worldCountries: readonly CountryFeature[] =
  convertedCountries?.type === 'FeatureCollection'
    ? convertedCountries.features.flatMap<CountryFeature>((country) => {
        if (
          country.geometry.type !== 'Polygon' &&
          country.geometry.type !== 'MultiPolygon'
        ) {
          return []
        }
        const properties = country.properties as { name?: unknown } | null
        const name =
          typeof properties?.name === 'string'
            ? properties.name
            : `Region ${country.id ?? ''}`.trim()
        const seed = hash(String(country.id ?? name))
        return [
          {
            type: 'Feature',
            id: country.id,
            geometry: country.geometry,
            properties: {
              name,
              traffic: 8_000 + (seed % 920_000),
            },
          },
        ]
      })
    : []

export const requestSeries = makeSeries(
  54,
  dashboardStart,
  20 * 60 * 1000,
  5_520_000,
  1_480_000,
  0.62,
)
export const bandwidthSeries = makeSeries(
  54,
  dashboardStart,
  20 * 60 * 1000,
  780,
  180,
  1.42,
)
export const cacheSeries = makeSeries(
  54,
  dashboardStart,
  20 * 60 * 1000,
  88.2,
  2.1,
  2.2,
)
export const threatSeries = makeSeries(
  54,
  dashboardStart,
  20 * 60 * 1000,
  18_600,
  5_400,
  0.18,
)

const viewportStart = Date.UTC(2026, 7, 5, 12)
const viewportStep = 5 * 60 * 1000

export const viewportTrafficRows: readonly MetricPoint[] = Array.from(
  { length: 7 * 24 * 12 + 1 },
  (_, index) => {
    const hour = index / 12
    const daily = Math.sin((hour / 24) * Math.PI * 2 - 1.1) * 780_000
    const shortCycle = Math.sin(index / 8.4) * 220_000
    const jitter = Math.cos(index / 2.7) * 88_000
    const incident = Math.exp(-Math.pow((hour - 141.5) / 2.2, 2)) * 2_650_000
    return {
      time: new Date(viewportStart + index * viewportStep),
      value: Math.round(5_900_000 + daily + shortCycle + jitter + incident),
    }
  },
)

export const viewportFullExtent = [
  viewportTrafficRows[0]!.time,
  viewportTrafficRows[viewportTrafficRows.length - 1]!.time,
] as const

export const viewportInitialWindow: TrafficViewportWindow = {
  start: new Date(Date.UTC(2026, 7, 11, 6)),
  end: new Date(Date.UTC(2026, 7, 11, 12)),
}

export const topCountries = [
  { label: 'United States', value: 38.2, requests: '69.7M' },
  { label: 'Germany', value: 12.7, requests: '23.2M' },
  { label: 'Brazil', value: 9.4, requests: '17.1M' },
  { label: 'Japan', value: 7.8, requests: '14.2M' },
  { label: 'United Kingdom', value: 6.1, requests: '11.1M' },
] as const

export function sparklineDefinition(
  data: readonly MetricPoint[],
  color = dashboardBlue,
) {
  return defineChart({
    marks: [
      decorative(
        areaY(data, {
          x: 'time',
          y: 'value',
          fill: color,
          fillOpacity: 0.14,
        }),
      ),
      lineY(data, {
        x: 'time',
        y: 'value',
        stroke: color,
        strokeWidth: 1.35,
      }),
    ],
    x: { scale: scaleUtc, axis: false },
    y: { scale: scaleLinear, axis: false },
    margin: 1,
  })
}

export function dashboardTrafficDefinition({
  revision,
  interval,
  days,
}: {
  revision: number
  interval: DashboardInterval
  days: number
}) {
  const minutes = intervalMinutes(interval, days)
  const requestedCount = Math.ceil((days * 24 * 60) / minutes) + 1
  const count = Math.min(requestedCount, 520)
  const step = (days * 24 * 60 * 60 * 1000) / Math.max(1, count - 1)
  const start = dashboardStart - days * 24 * 60 * 60 * 1000
  const data = makeSeries(count, start, step, 4_850_000, 1_340_000, 0.85).map(
    (row, index) => ({
      ...row,
      value:
        index >= count - 3
          ? row.value * (1 + ((revision % 7) - 3) * 0.006)
          : row.value,
    }),
  )
  const startIncomplete = data.slice(0, Math.min(4, data.length))
  const complete = data.slice(3, Math.max(4, data.length - 3))
  const endIncomplete = data.slice(Math.max(0, data.length - 4))

  return defineChart(
    {
      marks: [
        hatchRegionMark('dashboard-incomplete', 0.026),
        lineY(startIncomplete, {
          id: 'Incomplete start',
          x: 'time',
          y: 'value',
          stroke: dashboardBlue,
          strokeWidth: 1.6,
          strokeDasharray: '4 4',
        }),
        lineY(complete, {
          id: 'Requests',
          x: 'time',
          y: 'value',
          stroke: dashboardBlue,
          strokeWidth: 1.6,
        }),
        lineY(endIncomplete, {
          id: 'Incomplete end',
          x: 'time',
          y: 'value',
          stroke: dashboardBlue,
          strokeWidth: 1.6,
          strokeDasharray: '4 4',
        }),
      ],
      x: {
        scale: scaleUtc,
        axis: {
          ticks: { count: 7, format: days === 1 ? hourFormat : dayFormat },
        },
      },
      y: {
        scale: scaleLinear,
        nice: 4,
        grid: true,
        axis: { ticks: { count: 5, format: compact } },
      },
      margin: { top: 10, right: 14, bottom: 27, left: 54 },
    },
    {
      focus: 'nearest',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${fullTimeFormat(point.xValue)} · ${compact(point.yValue)} requests`,
      },
    },
  )
}

export function viewportTrafficDefinition(
  window: TrafficViewportWindow,
  onChange: (window: TrafficViewportWindow, reason: ZoomXChange<Date>) => void,
  onActiveChange?: (active: boolean) => void,
) {
  const rows = rowsForViewport(viewportTrafficRows, window)
  const yDomain = paddedValueDomain(rows)

  return defineChart({
    marks: [
      lineY(rows, {
        id: 'viewport-requests',
        x: 'time',
        y: 'value',
        stroke: dashboardBlue,
        strokeWidth: 2,
      }),
    ],
    x: {
      scale: scaleUtc().domain([window.start, window.end]),
      axis: {
        ticks: { count: 7, format: viewportAxisFormat },
        tickLabels: { thin: { minGap: 8, priority: 'ends' } },
      },
    },
    y: {
      scale: scaleLinear().domain(yDomain),
      nice: 4,
      grid: true,
      axis: { ticks: { count: 5, format: compact } },
    },
    controls: [
      zoomX({
        id: 'request-viewport',
        window: controlledSignal<TrafficViewportWindow, ZoomXChange<Date>>(
          window,
          (next, { reason }) => onChange(next, reason),
        ),
        extent: viewportFullExtent,
        scaleExtent: [1, 168],
        ariaLabel: 'Request traffic viewport',
        ariaDescription:
          'Drag to pan. Scroll to zoom after focusing the chart. Use arrow keys to pan, plus and minus to zoom, and Home to reset.',
        format: viewportControlFormat,
        onActiveChange,
      }),
    ],
    focus: false,
    keyboard: false,
    focusRing: false,
    svgAnimation: false,
    margin: { top: 16, right: 16, bottom: 30, left: 58 },
  })
}

export function viewportScrubberDefinition(
  window: TrafficViewportWindow,
  onChange: (window: BrushRange<Date>, reason: BrushXChange<Date>) => void,
) {
  return defineChart({
    marks: [
      decorative(
        areaY(viewportTrafficRows, {
          id: 'viewport-overview-area',
          x: 'time',
          y: 'value',
          fill: dashboardBlue,
          fillOpacity: 0.12,
        }),
      ),
      lineY(viewportTrafficRows, {
        id: 'viewport-overview-line',
        x: 'time',
        y: 'value',
        stroke: dashboardBlue,
        strokeWidth: 1.2,
      }),
    ],
    x: {
      scale: scaleUtc().domain(viewportFullExtent),
      axis: {
        ticks: { count: 7, format: viewportOverviewFormat },
        tickLabels: { thin: { minGap: 6, priority: 'ends' } },
      },
    },
    y: {
      scale: scaleLinear().domain([
        0,
        Math.max(...viewportTrafficRows.map((row) => row.value)) * 1.04,
      ]),
      axis: false,
    },
    controls: [
      brushX({
        id: 'request-scrubber',
        range: controlledSignal<BrushRange<Date>, BrushXChange<Date>>(
          window,
          (next, { reason }) => onChange(next, reason),
        ),
        keyboard: false,
        ariaLabel: 'Visible request range',
        startAriaLabel: 'Visible range start',
        endAriaLabel: 'Visible range end',
        format: viewportControlFormat,
        handleSize: 20,
        selectionStyle: {
          fill: dashboardBlue,
          fillOpacity: 0.14,
          stroke: dashboardBlue,
          strokeWidth: 1.5,
        },
      }),
    ],
    focus: false,
    keyboard: false,
    focusRing: false,
    svgAnimation: false,
    margin: { top: 5, right: 16, bottom: 25, left: 58 },
  })
}

export const countryGlobeDefinition = defineChart(
  {
    marks: [
      geoShape([{ type: 'Sphere' as const }], {
        projection: {
          type: () => geoOrthographic().rotate([96, -18]).clipAngle(90),
          fit: 'sphere',
          inset: 8,
        },
        fill: '#f5f7fa',
        stroke: '#b8c2ce',
        strokeWidth: 0.8,
      }),
      geoShape(worldCountries, {
        projection: {
          type: () => geoOrthographic().rotate([96, -18]).clipAngle(90),
          fit: 'sphere',
          inset: 8,
        },
        color: (country) => country.properties.traffic,
        stroke: '#ffffff',
        strokeWidth: 0.45,
      }),
    ],
    color: {
      scale: scaleQuantize<string>,
      range: ['#e6f0ff', '#b9d4fb', '#76a9ef', '#347bd2', '#0b4da2'],
    },
    margin: 4,
  },
  {
    tooltip: {
      use: tooltip,
      format: (point) =>
        'properties' in point.datum
          ? `${point.datum.properties.name} · ${compact(point.datum.properties.traffic)}`
          : 'Worldwide requests',
    },
  },
)

const radarTotal = makeSeries(
  57,
  radarStart,
  3 * 60 * 60 * 1000,
  112,
  17,
  0.2,
).map((row) => ({ ...row, series: 'Total bytes' as const }))
const radarHttp = radarTotal.map((row, index) => ({
  ...row,
  value: row.value * (0.69 + Math.sin(index / 8) * 0.025),
  series: 'HTTP bytes' as const,
}))
const radarPreviousRows = makeSeries(
  57,
  radarStart,
  3 * 60 * 60 * 1000,
  105,
  14,
  1.05,
).map((row) => ({ ...row, series: 'Previous 7 days' as const }))

export function radarTrafficDefinition(visibility: RadarSeriesVisibility) {
  const marks = [
    hatchRegionMark('radar-incomplete', 0.035),
    ...(visibility.previous
      ? [
          lineY(radarPreviousRows, {
            id: 'Previous 7 days',
            x: 'time',
            y: 'value',
            stroke: radarPrevious,
            strokeWidth: 1.5,
            strokeDasharray: '5 5',
          }),
        ]
      : []),
    ...(visibility.total
      ? [
          lineY(radarTotal, {
            id: 'Total bytes',
            x: 'time',
            y: 'value',
            stroke: radarBlue,
            strokeWidth: 2,
          }),
        ]
      : []),
    ...(visibility.http
      ? [
          lineY(radarHttp, {
            id: 'HTTP bytes',
            x: 'time',
            y: 'value',
            stroke: radarCyan,
            strokeWidth: 2,
          }),
        ]
      : []),
  ]

  return defineChart(
    {
      marks,
      x: {
        scale: scaleUtc,
        axis: {
          ticks: { count: 7, format: dayFormat },
          tickLabels: { thin: { minGap: 8, priority: 'ends' } },
        },
      },
      y: {
        scale: scaleLinear().domain([0, 150]),
        grid: true,
        axis: {
          ticks: {
            values: [0, 150],
            format: (value) => (value === 0 ? '0' : 'Max'),
          },
        },
      },
      margin: { top: 10, right: 14, bottom: 27, left: 42 },
    },
    {
      focus: 'nearest',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as RadarPoint).series} · ${point.yValue.toFixed(1)} TB`,
      },
    },
  )
}

function hatchRegionMark(id: string, widthRatio: number) {
  return createMark<never>(() => ({
    id,
    channels: {},
    render: ({ chart }) => {
      const width = Math.max(12, chart.width * widthRatio)
      const left = chart.x + chart.width - width
      const top = chart.y
      const height = chart.height
      const right = left + width
      const bottom = top + height
      const children: SceneNode[] = [
        {
          kind: 'rect',
          key: `${id}:background`,
          x: left,
          y: top,
          width,
          height,
          style: { fill: '#6b7280', fillOpacity: 0.035 },
        },
      ]

      for (let diagonal = 0; diagonal <= width + height; diagonal += 5) {
        const intersections: Array<readonly [number, number]> = []
        if (diagonal <= width) intersections.push([left + diagonal, top])
        if (diagonal >= width && diagonal <= width + height) {
          intersections.push([right, top + diagonal - width])
        }
        if (diagonal >= height && diagonal <= width + height) {
          intersections.push([left + diagonal - height, bottom])
        }
        if (diagonal <= height) intersections.push([left, top + diagonal])
        const first = intersections[0]
        const last = intersections[intersections.length - 1]
        if (!first || !last || first === last) continue
        children.push({
          kind: 'rule',
          key: `${id}:line:${diagonal}`,
          x1: first[0],
          y1: first[1],
          x2: last[0],
          y2: last[1],
          style: { stroke: '#6b7280', strokeOpacity: 0.12, strokeWidth: 1 },
        })
      }

      return {
        nodes: [
          {
            kind: 'group',
            key: id,
            className: 'cloudflare-incomplete-region',
            ariaHidden: true,
            children,
          },
        ],
      }
    },
  }))
}

export function protocolGaugeDefinition() {
  const segments: readonly Segment[] = [
    { label: 'HTTP', value: 73.2 },
    { label: 'Other', value: 26.8 },
  ]
  const arcs = pie<Segment>([...segments], {
    value: 'value',
    startAngle: -Math.PI / 2,
    endAngle: Math.PI / 2,
  })

  return defineChart(
    {
      marks: [
        polar({
          startAngle: -Math.PI / 2,
          endAngle: Math.PI / 2,
          radiusRatio: 0.96,
          angle: { scale: scaleLinear().domain([-Math.PI / 2, Math.PI / 2]) },
          radius: { scale: scaleLinear().domain([0, 1]) },
          marks: [
            radialArc(arcs, {
              key: 'label',
              innerRadius: ({ radius }) => radius * 0.63,
              color: 'label',
            }),
          ],
        }),
      ],
      color: {
        scale: scaleOrdinal<string, string>()
          .domain(['HTTP', 'Other'])
          .range([radarBlue, radarCyan]),
      },
      margin: 0,
    },
    {
      tooltip: {
        use: tooltip,
        format: (point) =>
          'fraction' in point.datum
            ? `${point.datum.label} · ${point.datum.value}%`
            : '',
      },
    },
  )
}

function makeSeries(
  count: number,
  start: number,
  step: number,
  baseline: number,
  amplitude: number,
  phase: number,
): MetricPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(start + index * step),
    value:
      baseline +
      Math.sin(index / 3.7 + phase) * amplitude +
      Math.cos(index / 1.9 + phase) * amplitude * 0.28 +
      index * amplitude * 0.002,
  }))
}

function rowsForViewport(
  rows: readonly MetricPoint[],
  window: TrafficViewportWindow,
) {
  const start = window.start.getTime()
  const end = window.end.getTime()
  const first = rows.findIndex((row) => row.time.getTime() >= start)
  if (first < 0) return rows.slice(-2)
  let last = first
  while (last + 1 < rows.length && rows[last + 1]!.time.getTime() <= end) {
    last += 1
  }
  return rows.slice(Math.max(0, first - 1), Math.min(rows.length, last + 2))
}

function paddedValueDomain(rows: readonly MetricPoint[]) {
  const values = rows.map((row) => row.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const padding = Math.max(1, (maximum - minimum) * 0.12)
  return [minimum - padding, maximum + padding] as const
}

function intervalMinutes(interval: DashboardInterval, days: number) {
  if (interval === '5 minutes') return 5
  if (interval === '15 minutes') return 15
  if (interval === '1 hour') return 60
  if (interval === '1 day') return 24 * 60
  return days === 1 ? 20 : 120
}

function compact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

const hourFormat = (value: Date | number) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    timeZone: 'UTC',
  }).format(value)

const fullTimeFormat = (value: Date | number) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(value)

const viewportAxisFormat = (value: Date | number) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    timeZone: 'UTC',
  }).format(value)

const viewportOverviewFormat = (value: Date | number) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(value)

const viewportControlFormat = (value: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(value)

const dayFormat = (value: Date | number) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(value)

function hash(value: string) {
  let result = 2166136261
  for (const character of value) {
    result ^= character.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}
