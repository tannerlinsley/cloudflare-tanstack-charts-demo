import { areaY, barY, createMark, defineChart, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import type { SceneNode } from '@tanstack/charts'

export type SecurityTraffic = 'Mitigated' | 'Served by Cloudflare' | 'Origin'
export type GatewayProvider = 'OpenAI' | 'Anthropic' | 'Workers AI'

interface TimePoint {
  readonly time: Date
  readonly value: number
  readonly series: string
}

interface BucketPoint {
  readonly bucket: string
  readonly value: number
}

interface DonutSegment {
  readonly label: string
  readonly value: number
}

const blue = '#0051c3'
const cyan = '#0096c7'
const green = '#1f9d68'
const orange = '#d97706'
const red = '#c2413b'
const purple = '#6d5bd0'
const start = Date.UTC(2026, 7, 11, 12)

const securityRows = {
  Mitigated: makeSeries('Mitigated', 49, 1_080_000, 260_000, 0.3),
  'Served by Cloudflare': makeSeries(
    'Served by Cloudflare',
    49,
    4_850_000,
    780_000,
    1.1,
  ),
  Origin: makeSeries('Origin', 49, 3_680_000, 640_000, 2.2),
} satisfies Record<SecurityTraffic, readonly TimePoint[]>

export const attackScoreBuckets: readonly BucketPoint[] = [
  { bucket: '1', value: 812_000 },
  { bucket: '2–9', value: 394_000 },
  { bucket: '10–29', value: 188_000 },
  { bucket: '30–49', value: 96_000 },
  { bucket: '50–79', value: 54_000 },
  { bucket: '80–99', value: 21_000 },
]

export const botScoreBuckets: readonly BucketPoint[] = [
  { bucket: '1', value: 622_000 },
  { bucket: '2–9', value: 318_000 },
  { bucket: '10–29', value: 165_000 },
  { bucket: '30–49', value: 111_000 },
  { bucket: '50–79', value: 86_000 },
  { bucket: '80–99', value: 39_000 },
]

export function securityActivityDefinition(
  visibility: Readonly<Record<SecurityTraffic, boolean>>,
) {
  const colors: Record<SecurityTraffic, string> = {
    Mitigated: orange,
    'Served by Cloudflare': blue,
    Origin: cyan,
  }
  const marks = (Object.keys(securityRows) as SecurityTraffic[]).flatMap(
    (series) =>
      visibility[series]
        ? [
            decorative(
              areaY(securityRows[series], {
                id: `${series} area`,
                x: 'time',
                y: 'value',
                fill: colors[series],
                fillOpacity: 0.07,
              }),
            ),
            lineY(securityRows[series], {
              id: series,
              x: 'time',
              y: 'value',
              stroke: colors[series],
              strokeWidth: 1.7,
            }),
          ]
        : [],
  )

  return defineChart(
    {
      marks,
      x: {
        scale: scaleUtc,
        axis: { ticks: { count: 7, format: hourFormat } },
      },
      y: {
        scale: scaleLinear,
        nice: 4,
        grid: true,
        axis: { ticks: { count: 5, format: compact } },
      },
      margin: { top: 10, right: 12, bottom: 28, left: 54 },
    },
    {
      focus: 'nearest',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as TimePoint).series} · ${compact(point.yValue)} requests`,
      },
    },
  )
}

export function scoreDistributionDefinition(
  rows: readonly BucketPoint[],
  color = orange,
) {
  return defineChart(
    {
      marks: [
        barY(rows, {
          x: 'bucket',
          y: 'value',
          fill: color,
          inset: 2,
          radius: 2,
        }),
      ],
      x: {
        scale: scaleBand,
        axis: { label: 'Score', ticks: { count: 6 } },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        nice: 3,
        axis: { ticks: { count: 4, format: compact } },
      },
      margin: { top: 8, right: 8, bottom: 40, left: 42 },
    },
    {
      focus: 'nearest',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `Score ${(point.datum as BucketPoint).bucket} · ${compact(point.yValue)} requests`,
      },
    },
  )
}

const workerInvocations = makeSeries('Invocations', 45, 72_000, 13_000, 0.2)
const workerErrors = makeSeries('Errors', 45, 390, 180, 1.7)
const workerCpu = makeSeries('CPU time', 45, 2.8, 0.62, 2.1)

export const workerSparkRows = {
  invocations: workerInvocations,
  errors: workerErrors,
  cpu: workerCpu,
}

const quantileRows = [
  ...makeSeries('P50', 49, 1.7, 0.24, 0.2),
  ...makeSeries('P90', 49, 3.4, 0.46, 0.7),
  ...makeSeries('P99', 49, 6.8, 0.92, 1.3),
  ...makeSeries('P99.9', 49, 11.6, 1.6, 2.1),
]

export function workerQuantileDefinition(metric: 'CPU' | 'Wall') {
  const multiplier = metric === 'CPU' ? 1 : 4.6
  const colors: Record<string, string> = {
    P50: green,
    P90: blue,
    P99: purple,
    'P99.9': orange,
  }
  const rows = quantileRows.map((row) => ({
    ...row,
    value: row.value * multiplier,
  }))

  return defineChart(
    {
      marks: [
        deploymentMarker(),
        ...Object.keys(colors).map((series) =>
          lineY(
            rows.filter((row) => row.series === series),
            {
              id: series,
              x: 'time',
              y: 'value',
              stroke: colors[series],
              strokeWidth: 1.55,
            },
          ),
        ),
      ],
      x: {
        scale: scaleUtc,
        axis: { ticks: { count: 7, format: hourFormat } },
      },
      y: {
        scale: scaleLinear,
        nice: 4,
        grid: true,
        axis: {
          ticks: {
            count: 5,
            format: (value) => `${Number(value).toFixed(0)} ms`,
          },
        },
      },
      margin: { top: 12, right: 10, bottom: 28, left: 52 },
    },
    {
      focus: 'group-x',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as TimePoint).series} · ${point.yValue.toFixed(2)} ms`,
      },
    },
  )
}

export function workerHistogramDefinition() {
  const rows: readonly BucketPoint[] = [
    { bucket: '<1', value: 1_280_000 },
    { bucket: '1–2', value: 2_760_000 },
    { bucket: '2–5', value: 1_940_000 },
    { bucket: '5–10', value: 722_000 },
    { bucket: '10–25', value: 215_000 },
    { bucket: '25–50', value: 51_000 },
    { bucket: '50+', value: 8_600 },
  ]
  return defineChart(
    {
      marks: [
        barY(rows, {
          x: 'bucket',
          y: 'value',
          fill: blue,
          fillOpacity: 0.82,
          inset: 2,
        }),
      ],
      x: {
        scale: scaleBand,
        axis: { label: 'Duration (ms)', ticks: { count: rows.length } },
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { ticks: { count: 4, format: compact } },
      },
      margin: { top: 8, right: 10, bottom: 40, left: 48 },
    },
    {
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as BucketPoint).bucket} ms · ${compact(point.yValue)} requests`,
      },
    },
  )
}

export function resourceTopologyDefinition() {
  return defineChart({
    marks: [resourceTopologyMark()],
    x: { scale: scaleLinear, axis: false },
    y: { scale: scaleLinear, axis: false },
    margin: 0,
  })
}

const gatewayRows = {
  OpenAI: makeSeries('OpenAI', 49, 66_000, 11_000, 0.4),
  Anthropic: makeSeries('Anthropic', 49, 41_000, 8_200, 1.4),
  'Workers AI': makeSeries('Workers AI', 49, 31_000, 6_800, 2.3),
} satisfies Record<GatewayProvider, readonly TimePoint[]>

export function gatewayRequestsDefinition(provider: GatewayProvider | 'All') {
  const colors: Record<GatewayProvider, string> = {
    OpenAI: green,
    Anthropic: orange,
    'Workers AI': purple,
  }
  const providers = (
    provider === 'All' ? Object.keys(gatewayRows) : [provider]
  ) as GatewayProvider[]
  return defineChart(
    {
      marks: providers.flatMap((item) => [
        decorative(
          areaY(gatewayRows[item], {
            id: `${item} area`,
            x: 'time',
            y: 'value',
            fill: colors[item],
            fillOpacity: 0.07,
          }),
        ),
        lineY(gatewayRows[item], {
          id: item,
          x: 'time',
          y: 'value',
          stroke: colors[item],
          strokeWidth: 1.7,
        }),
      ]),
      x: {
        scale: scaleUtc,
        axis: { ticks: { count: 7, format: hourFormat } },
      },
      y: {
        scale: scaleLinear,
        nice: 4,
        grid: true,
        axis: { ticks: { count: 5, format: compact } },
      },
      margin: { top: 10, right: 12, bottom: 28, left: 50 },
    },
    {
      focus: 'nearest',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as TimePoint).series} · ${compact(point.yValue)} requests`,
      },
    },
  )
}

export function gatewayTokensDefinition(provider: GatewayProvider | 'All') {
  const factor: Record<GatewayProvider, number> = {
    OpenAI: 1_280,
    Anthropic: 1_860,
    'Workers AI': 740,
  }
  const selected = (
    provider === 'All' ? Object.keys(gatewayRows) : [provider]
  ) as GatewayProvider[]
  const rows = selected.flatMap((item) =>
    gatewayRows[item].map((row) => ({
      ...row,
      value: row.value * factor[item],
    })),
  )
  const colors: Record<GatewayProvider, string> = {
    OpenAI: green,
    Anthropic: orange,
    'Workers AI': purple,
  }
  return defineChart(
    {
      marks: selected.map((item) =>
        lineY(
          rows.filter((row) => row.series === item),
          {
            id: item,
            x: 'time',
            y: 'value',
            stroke: colors[item],
            strokeWidth: 1.7,
          },
        ),
      ),
      x: {
        scale: scaleUtc,
        axis: { ticks: { count: 7, format: hourFormat } },
      },
      y: {
        scale: scaleLinear,
        nice: 4,
        grid: true,
        axis: { ticks: { count: 4, format: compact } },
      },
      margin: { top: 10, right: 12, bottom: 28, left: 58 },
    },
    {
      focus: 'group-x',
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as TimePoint).series} · ${compact(point.yValue)} tokens`,
      },
    },
  )
}

export function gatewayCostDefinition() {
  const rows: readonly BucketPoint[] = [
    { bucket: 'GPT-5', value: 428.14 },
    { bucket: 'Claude', value: 311.92 },
    { bucket: 'GPT-4.1', value: 186.4 },
    { bucket: 'Llama', value: 84.26 },
    { bucket: 'Other', value: 39.18 },
  ]
  return defineChart(
    {
      marks: [
        barY(rows, {
          x: 'bucket',
          y: 'value',
          fill: green,
          inset: 5,
          radius: 2,
        }),
      ],
      x: { scale: scaleBand, axis: { ticks: { count: rows.length } } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { ticks: { count: 4, format: (value) => `$${value}` } },
      },
      margin: { top: 8, right: 10, bottom: 30, left: 48 },
    },
    {
      tooltip: {
        use: tooltip,
        format: (point) =>
          `${(point.datum as BucketPoint).bucket} · $${point.yValue.toFixed(2)}`,
      },
    },
  )
}

export function statusDonutDefinition(kind: 'worker' | 'gateway' = 'worker') {
  const segments: readonly DonutSegment[] =
    kind === 'worker'
      ? [
          { label: 'Success', value: 98.72 },
          { label: 'Errors', value: 0.84 },
          { label: 'Exceeded limits', value: 0.44 },
        ]
      : [
          { label: 'Uncached', value: 71.4 },
          { label: 'Cached', value: 28.6 },
        ]
  const colors = kind === 'worker' ? [green, red, orange] : ['#dbe5f1', green]
  const arcs = pie<DonutSegment>([...segments], { value: 'value' })
  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.94,
          angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
          radius: { scale: scaleLinear().domain([0, 1]) },
          marks: [
            radialArc(arcs, {
              key: 'label',
              innerRadius: ({ radius }) => radius * 0.67,
              color: 'label',
            }),
          ],
        }),
      ],
      color: {
        scale: scaleOrdinal<string, string>()
          .domain(segments.map((segment) => segment.label))
          .range(colors),
      },
      margin: 0,
    },
    {
      tooltip: {
        use: tooltip,
        format: (point) =>
          'label' in point.datum
            ? `${point.datum.label} · ${point.datum.value}%`
            : '',
      },
    },
  )
}

function resourceTopologyMark() {
  return createMark<never>(() => ({
    id: 'worker-resource-topology',
    channels: {},
    render: ({ chart }) => {
      const x = chart.x
      const y = chart.y
      const w = chart.width
      const h = chart.height
      const nodes: SceneNode[] = []
      const inputs = [
        { label: 'workers.dev', detail: 'Route', y: 0.12 },
        { label: 'Every 5 minutes', detail: 'Cron trigger', y: 0.42 },
        { label: 'events', detail: 'Queue consumer', y: 0.72 },
      ]
      const outputs = [
        { label: 'SESSION_CACHE', detail: 'KV namespace', y: 0.13 },
        { label: 'ANALYTICS', detail: 'D1 database', y: 0.43 },
        { label: 'AI', detail: 'Workers AI', y: 0.73 },
      ]
      const boxW = Math.min(170, w * 0.23)
      const boxH = 43
      const workerW = Math.min(200, w * 0.27)
      const workerH = 76
      const workerX = x + (w - workerW) / 2
      const workerY = y + (h - workerH) / 2

      const addBox = (
        key: string,
        left: number,
        top: number,
        width: number,
        height: number,
        label: string,
        detail: string,
        accent = blue,
      ) => {
        nodes.push(
          {
            kind: 'rect',
            key: `${key}:box`,
            x: left,
            y: top,
            width,
            height,
            radius: 4,
            style: { fill: '#ffffff', stroke: '#c9ced6', strokeWidth: 1 },
          },
          {
            kind: 'rect',
            key: `${key}:accent`,
            x: left,
            y: top,
            width: 4,
            height,
            radius: 2,
            style: { fill: accent },
          },
          {
            kind: 'label',
            key: `${key}:label`,
            x: left + 14,
            y: top + 14,
            text: label,
            baseline: 'middle',
            fontSize: 11,
            fontWeight: 600,
            style: { fill: '#252a31' },
          },
          {
            kind: 'label',
            key: `${key}:detail`,
            x: left + 14,
            y: top + 30,
            text: detail,
            baseline: 'middle',
            fontSize: 9,
            style: { fill: '#737b87' },
          },
        )
      }

      for (const [index, item] of inputs.entries()) {
        const top = y + h * item.y - boxH / 2
        nodes.push({
          kind: 'rule',
          key: `input:${index}:link`,
          x1: x + boxW,
          y1: top + boxH / 2,
          x2: workerX,
          y2: workerY + workerH / 2,
          style: { stroke: '#b8bec7', strokeWidth: 1.2 },
        })
        addBox(`input:${index}`, x, top, boxW, boxH, item.label, item.detail)
      }
      for (const [index, item] of outputs.entries()) {
        const top = y + h * item.y - boxH / 2
        nodes.push({
          kind: 'rule',
          key: `output:${index}:link`,
          x1: workerX + workerW,
          y1: workerY + workerH / 2,
          x2: x + w - boxW,
          y2: top + boxH / 2,
          style: { stroke: '#b8bec7', strokeWidth: 1.2 },
        })
        addBox(
          `output:${index}`,
          x + w - boxW,
          top,
          boxW,
          boxH,
          item.label,
          item.detail,
          purple,
        )
      }
      addBox(
        'worker',
        workerX,
        workerY,
        workerW,
        workerH,
        'edge-orchestrator',
        'Worker · Production',
        orange,
      )
      nodes.push({
        kind: 'label',
        key: 'worker:deployment',
        x: workerX + 14,
        y: workerY + 53,
        text: 'Deployed 18 minutes ago',
        baseline: 'middle',
        fontSize: 9,
        style: { fill: '#147a4a' },
      })
      return { nodes }
    },
  }))
}

function deploymentMarker() {
  return createMark<never>(() => ({
    id: 'deployment-marker',
    channels: {},
    render: ({ chart }) => {
      const markerX = chart.x + chart.width * 0.68
      return {
        nodes: [
          {
            kind: 'rule',
            key: 'deployment-line',
            x1: markerX,
            y1: chart.y,
            x2: markerX,
            y2: chart.y + chart.height,
            style: {
              stroke: purple,
              strokeWidth: 1,
              strokeDasharray: '4 3',
              strokeOpacity: 0.7,
            },
          },
          {
            kind: 'label',
            key: 'deployment-label',
            x: markerX + 5,
            y: chart.y + 8,
            text: 'Deployment',
            fontSize: 9,
            style: { fill: purple },
          },
        ],
      }
    },
  }))
}

function makeSeries(
  series: string,
  count: number,
  baseline: number,
  amplitude: number,
  phase: number,
): TimePoint[] {
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(start + index * 30 * 60 * 1000),
    value: Math.max(
      0,
      baseline +
        Math.sin(index / 3.8 + phase) * amplitude +
        Math.cos(index / 1.7 + phase) * amplitude * 0.24 +
        (index === 35 ? amplitude * 1.45 : 0),
    ),
    series,
  }))
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
