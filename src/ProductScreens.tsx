import * as React from 'react'
import {
  attackScoreBuckets,
  botScoreBuckets,
  gatewayCostDefinition,
  gatewayRequestsDefinition,
  gatewayTokensDefinition,
  resourceTopologyDefinition,
  scoreDistributionDefinition,
  securityActivityDefinition,
  statusDonutDefinition,
  workerHistogramDefinition,
  workerQuantileDefinition,
  workerSparkRows,
  type GatewayProvider,
  type SecurityTraffic,
} from './productCharts'
import { sparklineDefinition } from './charts'
import { SpringChart } from './SpringChart'

export type ProductScreen = 'security' | 'workers' | 'ai-gateway'

const securityColors: Record<SecurityTraffic, string> = {
  Mitigated: '#d97706',
  'Served by Cloudflare': '#0051c3',
  Origin: '#0096c7',
}

const workerTopology = resourceTopologyDefinition()
const workerStatus = statusDonutDefinition('worker')
const gatewayCache = statusDonutDefinition('gateway')
const attackScoreChart = scoreDistributionDefinition(attackScoreBuckets)
const botScoreChart = scoreDistributionDefinition(botScoreBuckets, '#6d5bd0')
const workerHistogram = workerHistogramDefinition()
const gatewayCost = gatewayCostDefinition()

export function ProductSurface({ screen }: { screen: ProductScreen }) {
  if (screen === 'security') return <SecurityAnalytics />
  if (screen === 'workers') return <WorkersAnalytics />
  return <AiGatewayAnalytics />
}

function SecurityAnalytics() {
  const [days, setDays] = React.useState('24 hours')
  const [hostname, setHostname] = React.useState('All hostnames')
  const [action, setAction] = React.useState('All actions')
  const [attackRange, setAttackRange] = React.useState('All scores')
  const [botRange, setBotRange] = React.useState('All scores')
  const [visibility, setVisibility] = React.useState<
    Record<SecurityTraffic, boolean>
  >({ Mitigated: true, 'Served by Cloudflare': true, Origin: true })
  const [notice, setNotice] = React.useState('')
  useNoticeTimer(notice, setNotice)

  const activity = React.useMemo(
    () => securityActivityDefinition(visibility),
    [visibility],
  )
  const events = securityEvents.filter(
    (event) =>
      (hostname === 'All hostnames' || event.host === hostname) &&
      (action === 'All actions' || event.action === action) &&
      (attackRange === 'All scores' || scoreInRange(event.score, attackRange)),
  )

  return (
    <>
      <ProductHeading
        breadcrumbs="Websites / example.com / Security / Analytics"
        title="Security Analytics"
        description="Investigate HTTP requests and the security signals applied to them."
        actions={
          <>
            <button type="button" onClick={() => setNotice('Report exported')}>
              Export
            </button>
            <button className="button--primary" type="button">
              Configure security
            </button>
          </>
        }
      />

      <nav className="product-tabs" aria-label="Security analytics views">
        <button type="button" aria-current="page">
          Traffic
        </button>
        <button type="button">Events</button>
      </nav>

      <div className="product-filterbar" aria-label="Security filters">
        <FilterSelect
          label="Hostname"
          value={hostname}
          values={['All hostnames', 'example.com', 'api.example.com']}
          onChange={setHostname}
        />
        <FilterSelect
          label="Action"
          value={action}
          values={['All actions', 'Block', 'Managed Challenge', 'Allow']}
          onChange={setAction}
        />
        <button className="filter-add" type="button">
          + Add filter
        </button>
        <FilterSelect
          label="Time range"
          value={days}
          values={['24 hours', '7 days', '30 days']}
          onChange={setDays}
        />
      </div>

      <div className="security-kpis">
        <Kpi label="Total requests" value="9.61M" detail={`Last ${days}`} />
        <Kpi label="Mitigated" value="1.08M" detail="11.2% of requests" />
        <Kpi label="Served by Cloudflare" value="4.85M" detail="50.5%" />
        <Kpi label="Sent to origin" value="3.68M" detail="38.3%" />
      </div>

      <section className="product-card product-card--wide">
        <ProductCardHeader
          title="Request activity"
          description="Requests by final disposition"
          action={<button type="button">Group by ▾</button>}
        />
        <div className="series-toggles" aria-label="Request activity series">
          {(Object.keys(visibility) as SecurityTraffic[]).map((series) => (
            <button
              type="button"
              aria-pressed={visibility[series]}
              onClick={() =>
                setVisibility((current) => ({
                  ...current,
                  [series]: !current[series],
                }))
              }
              key={series}
            >
              <i style={{ background: securityColors[series] }} />
              <span>{series}</span>
              <strong>
                {series === 'Mitigated'
                  ? '1.08M'
                  : series === 'Origin'
                    ? '3.68M'
                    : '4.85M'}
              </strong>
            </button>
          ))}
        </div>
        <div className="product-chart product-chart--activity">
          <SpringChart
            definition={activity}
            height={310}
            initialWidth={1080}
            ariaLabel="Security request activity"
            ariaDescription="Mitigated, Cloudflare-served, and origin request volume over time."
          />
        </div>
      </section>

      <div className="product-grid product-grid--two">
        <ScorePanel
          title="Attack score"
          description="Likelihood that a request is malicious"
          definition={attackScoreChart}
          selected={attackRange}
          onSelect={setAttackRange}
          accent="#d97706"
        />
        <ScorePanel
          title="Bot score"
          description="Likelihood that a request is automated"
          definition={botScoreChart}
          selected={botRange}
          onSelect={setBotRange}
          accent="#6d5bd0"
        />
      </div>

      <section className="product-card suspicious-card">
        <ProductCardHeader
          title="Suspicious activity"
          description="Requests classified by Cloudflare security signals"
          action={<button type="button">View definitions</button>}
        />
        <div className="risk-bar" aria-label="Suspicious activity severity">
          <i style={{ width: '8.6%', background: '#8f1d1d' }} />
          <i style={{ width: '17.2%', background: '#d97706' }} />
          <i style={{ width: '29.4%', background: '#eab308' }} />
          <i style={{ width: '44.8%', background: '#2f855a' }} />
        </div>
        <div className="risk-legend">
          <span>
            <i style={{ background: '#8f1d1d' }} />
            Critical <strong>826K</strong>
          </span>
          <span>
            <i style={{ background: '#d97706' }} />
            High <strong>1.65M</strong>
          </span>
          <span>
            <i style={{ background: '#eab308' }} />
            Medium <strong>2.83M</strong>
          </span>
          <span>
            <i style={{ background: '#2f855a' }} />
            Low <strong>4.30M</strong>
          </span>
        </div>
      </section>

      <section className="product-card event-card">
        <ProductCardHeader
          title="Sampled requests"
          description={`${events.length} matching requests shown from the selected period`}
          action={<button type="button">Download CSV</button>}
        />
        <div className="event-table-wrap">
          <table className="event-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Client</th>
                <th>Hostname</th>
                <th>Path</th>
                <th>Attack score</th>
                <th>Rule source</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={`${event.time}-${event.path}`}>
                  <td>{event.time}</td>
                  <td>
                    <StatusPill status={event.action} />
                  </td>
                  <td>{event.client}</td>
                  <td>{event.host}</td>
                  <td>
                    <code>{event.path}</code>
                  </td>
                  <td>
                    <ScoreBadge score={event.score} />
                  </td>
                  <td>{event.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {notice && <Toast>{notice}</Toast>}
    </>
  )
}

function WorkersAnalytics() {
  const [metric, setMetric] = React.useState<'CPU' | 'Wall'>('CPU')
  const [range, setRange] = React.useState('24 hours')
  const [notice, setNotice] = React.useState('')
  useNoticeTimer(notice, setNotice)
  const quantiles = React.useMemo(
    () => workerQuantileDefinition(metric),
    [metric],
  )
  const sparkDefinitions = React.useMemo(
    () => ({
      invocations: sparklineDefinition(workerSparkRows.invocations),
      errors: sparklineDefinition(workerSparkRows.errors, '#c2413b'),
      cpu: sparklineDefinition(workerSparkRows.cpu, '#6d5bd0'),
    }),
    [],
  )

  return (
    <>
      <ProductHeading
        breadcrumbs="Workers & Pages / edge-orchestrator"
        title="edge-orchestrator"
        description="Production · workers.dev"
        badge="Deployed"
        actions={
          <>
            <button
              type="button"
              onClick={() => setNotice('Tail session started')}
            >
              Tail logs
            </button>
            <button className="button--primary" type="button">
              Edit code
            </button>
          </>
        }
      />
      <nav className="product-tabs" aria-label="Worker details">
        {[
          'Overview',
          'Metrics',
          'Deployments',
          'Bindings',
          'Observability',
        ].map((item) => (
          <button
            type="button"
            aria-current={item === 'Metrics' ? 'page' : undefined}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="product-card topology-card">
        <ProductCardHeader
          title="Connected resources"
          description="Traffic, triggers, and bindings for the active deployment"
          action={<button type="button">Manage bindings</button>}
        />
        <div className="topology-chart">
          <SpringChart
            definition={workerTopology}
            height={300}
            initialWidth={1100}
            ariaLabel="Worker connected resources"
            ariaDescription="Routes, cron triggers, and queues connect to the worker; KV, D1, and Workers AI are bound resources."
          />
        </div>
      </section>

      <div className="product-filterbar product-filterbar--right">
        <span className="data-freshness">
          <i /> Data updated 32 seconds ago
        </span>
        <FilterSelect
          label="Time range"
          value={range}
          values={['30 minutes', '6 hours', '24 hours', '7 days']}
          onChange={setRange}
        />
      </div>

      <div className="worker-metrics">
        <WorkerMetric
          label="Invocations"
          value="7.04M"
          detail="81.5 / sec"
          definition={sparkDefinitions.invocations}
        />
        <WorkerMetric
          label="Errors"
          value="59.2K"
          detail="0.84%"
          danger
          definition={sparkDefinitions.errors}
        />
        <WorkerMetric
          label="CPU time"
          value="2.81 ms"
          detail="P50"
          definition={sparkDefinitions.cpu}
        />
      </div>

      <div className="product-grid worker-detail-grid">
        <section className="product-card product-card--wide quantile-card">
          <ProductCardHeader
            title={`${metric} time`}
            description={`${metric === 'CPU' ? 'Execution' : 'Elapsed wall'} time by invocation percentile`}
            action={
              <div className="segmented-control">
                <button
                  type="button"
                  aria-pressed={metric === 'CPU'}
                  onClick={() => setMetric('CPU')}
                >
                  CPU
                </button>
                <button
                  type="button"
                  aria-pressed={metric === 'Wall'}
                  onClick={() => setMetric('Wall')}
                >
                  Wall
                </button>
              </div>
            }
          />
          <QuantileLegend />
          <div className="product-chart">
            <SpringChart
              definition={quantiles}
              height={310}
              initialWidth={800}
              ariaLabel={`${metric} time percentiles`}
              ariaDescription="P50, P90, P99, and P99.9 with a deployment marker."
            />
          </div>
        </section>
        <section className="product-card status-card">
          <ProductCardHeader
            title="Invocation status"
            description="7.04M total"
          />
          <div className="donut-wrap">
            <SpringChart
              definition={workerStatus}
              height={205}
              initialWidth={260}
              ariaLabel="Worker invocation status"
            />
            <strong>
              98.72%<small>Success</small>
            </strong>
          </div>
          <DonutLegend
            rows={[
              ['Success', '6.95M', '#1f9d68'],
              ['Errors', '59.2K', '#c2413b'],
              ['Exceeded limits', '31.0K', '#d97706'],
            ]}
          />
        </section>
      </div>

      <div className="product-grid product-grid--two">
        <section className="product-card">
          <ProductCardHeader
            title="Request duration"
            description="Invocations grouped by duration bucket"
          />
          <SpringChart
            definition={workerHistogram}
            height={270}
            initialWidth={560}
            ariaLabel="Worker request duration histogram"
          />
        </section>
        <section className="product-card deployment-card">
          <ProductCardHeader
            title="Active deployment"
            description="Version receiving 100% of traffic"
            action={<button type="button">View all</button>}
          />
          <div className="deployment-row">
            <i />
            <div>
              <strong>Version 3f7c9a2</strong>
              <span>Production · deployed 18 minutes ago</span>
            </div>
            <b>100%</b>
          </div>
          <dl className="deployment-details">
            <div>
              <dt>Compatibility date</dt>
              <dd>2026-08-01</dd>
            </div>
            <div>
              <dt>Bundle size</dt>
              <dd>184.7 KiB</dd>
            </div>
            <div>
              <dt>Startup time</dt>
              <dd>4 ms</dd>
            </div>
            <div>
              <dt>Placement</dt>
              <dd>Smart Placement</dd>
            </div>
          </dl>
        </section>
      </div>
      {notice && <Toast>{notice}</Toast>}
    </>
  )
}

function AiGatewayAnalytics() {
  const [provider, setProvider] = React.useState<GatewayProvider | 'All'>('All')
  const [model, setModel] = React.useState('All models')
  const [range, setRange] = React.useState('24 hours')
  const [notice, setNotice] = React.useState('')
  useNoticeTimer(notice, setNotice)
  const requestChart = React.useMemo(
    () => gatewayRequestsDefinition(provider),
    [provider],
  )
  const tokenChart = React.useMemo(
    () => gatewayTokensDefinition(provider),
    [provider],
  )

  return (
    <>
      <ProductHeading
        breadcrumbs="AI / AI Gateway / production-gateway"
        title="production-gateway"
        description="AI Gateway"
        badge="Active"
        actions={
          <>
            <button type="button">Gateway settings</button>
            <button
              className="button--primary"
              type="button"
              onClick={() => setNotice('API endpoint copied')}
            >
              Copy endpoint
            </button>
          </>
        }
      />
      <nav className="product-tabs" aria-label="AI Gateway views">
        {['Overview', 'Analytics', 'Logs', 'Evaluations', 'Settings'].map(
          (item) => (
            <button
              type="button"
              aria-current={item === 'Analytics' ? 'page' : undefined}
              key={item}
            >
              {item}
            </button>
          ),
        )}
      </nav>
      <div className="product-filterbar">
        <FilterSelect
          label="Provider"
          value={provider}
          values={['All', 'OpenAI', 'Anthropic', 'Workers AI']}
          onChange={(value) => setProvider(value as GatewayProvider | 'All')}
        />
        <FilterSelect
          label="Model"
          value={model}
          values={['All models', 'GPT-5', 'Claude Sonnet 4', 'Llama 4 Scout']}
          onChange={setModel}
        />
        <FilterSelect
          label="Time range"
          value={range}
          values={['1 hour', '6 hours', '24 hours', '7 days']}
          onChange={setRange}
        />
      </div>

      <div className="gateway-kpis">
        <Kpi label="Requests" value="3.31M" detail="↑ 12.4%" positive />
        <Kpi label="Tokens" value="4.28B" detail="Input + output" />
        <Kpi label="Cost" value="$1,049.90" detail="Estimated" />
        <Kpi label="Errors" value="37.8K" detail="1.14%" danger />
        <Kpi label="Cached responses" value="947K" detail="28.6%" positive />
      </div>

      <div className="product-grid product-grid--two gateway-chart-grid">
        <section className="product-card">
          <ProductCardHeader
            title="Requests"
            description={`${provider === 'All' ? 'All providers' : provider} · ${range}`}
            action={<button type="button">•••</button>}
          />
          <GatewayLegend provider={provider} />
          <SpringChart
            definition={requestChart}
            height={290}
            initialWidth={600}
            ariaLabel="AI Gateway requests by provider"
          />
        </section>
        <section className="product-card">
          <ProductCardHeader
            title="Token usage"
            description="Input and output tokens"
            action={<button type="button">•••</button>}
          />
          <GatewayLegend provider={provider} />
          <SpringChart
            definition={tokenChart}
            height={290}
            initialWidth={600}
            ariaLabel="AI Gateway token usage by provider"
          />
        </section>
      </div>

      <div className="product-grid gateway-lower-grid">
        <section className="product-card">
          <ProductCardHeader
            title="Cost by model"
            description="Estimated provider cost in USD"
          />
          <SpringChart
            definition={gatewayCost}
            height={280}
            initialWidth={560}
            ariaLabel="AI Gateway estimated cost by model"
          />
        </section>
        <section className="product-card status-card gateway-cache-card">
          <ProductCardHeader
            title="Cached responses"
            description="Semantic and exact cache matches"
          />
          <div className="donut-wrap">
            <SpringChart
              definition={gatewayCache}
              height={190}
              initialWidth={260}
              ariaLabel="AI Gateway cache status"
            />
            <strong>
              28.6%<small>Cache hit rate</small>
            </strong>
          </div>
          <DonutLegend
            rows={[
              ['Cached', '947K', '#1f9d68'],
              ['Uncached', '2.36M', '#dbe5f1'],
            ]}
          />
          <div className="cache-savings">
            <span>
              Tokens avoided <strong>812M</strong>
            </span>
            <span>
              Estimated savings <strong>$204.16</strong>
            </span>
          </div>
        </section>
      </div>

      <section className="product-card provider-card">
        <ProductCardHeader
          title="Provider performance"
          description="Request volume, latency, reliability, and cost"
          action={<button type="button">Download CSV</button>}
        />
        <div className="event-table-wrap">
          <table className="event-table provider-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Requests</th>
                <th>Tokens</th>
                <th>P50 latency</th>
                <th>P95 latency</th>
                <th>Error rate</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {gatewayProviders.map((row) => (
                <tr key={row.provider}>
                  <td>
                    <span className="provider-name">
                      <i style={{ background: row.color }} />
                      {row.provider}
                    </span>
                  </td>
                  <td>{row.requests}</td>
                  <td>{row.tokens}</td>
                  <td>{row.p50}</td>
                  <td>{row.p95}</td>
                  <td>
                    <span
                      className={
                        Number.parseFloat(row.error) > 1.5 ? 'text-danger' : ''
                      }
                    >
                      {row.error}
                    </span>
                  </td>
                  <td>{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {notice && <Toast>{notice}</Toast>}
    </>
  )
}

function ProductHeading({
  breadcrumbs,
  title,
  description,
  badge,
  actions,
}: {
  breadcrumbs: string
  title: string
  description: string
  badge?: string
  actions: React.ReactNode
}) {
  return (
    <>
      <div className="breadcrumbs">{breadcrumbs}</div>
      <header className="page-heading product-heading">
        <div>
          <div className="heading-line">
            <h1>{title}</h1>
            {badge && (
              <span className="state-badge">
                <i />
                {badge}
              </span>
            )}
          </div>
          <p>{description}</p>
        </div>
        <div className="toolbar toolbar--primary">{actions}</div>
      </header>
    </>
  )
}

function ProductCardHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className="product-card__header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="product-card__action">{action}</div>}
    </header>
  )
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string
  value: string
  values: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  )
}

function Kpi({
  label,
  value,
  detail,
  positive,
  danger,
}: {
  label: string
  value: string
  detail: string
  positive?: boolean
  danger?: boolean
}) {
  return (
    <section className="product-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small
        data-positive={positive || undefined}
        data-danger={danger || undefined}
      >
        {detail}
      </small>
    </section>
  )
}

function ScorePanel({
  title,
  description,
  definition,
  selected,
  onSelect,
  accent,
}: {
  title: string
  description: string
  definition: ReturnType<typeof scoreDistributionDefinition>
  selected: string
  onSelect: (value: string) => void
  accent: string
}) {
  return (
    <section className="product-card score-card">
      <ProductCardHeader
        title={title}
        description={description}
        action={<button type="button">?</button>}
      />
      <SpringChart
        definition={definition}
        height={240}
        initialWidth={560}
        ariaLabel={`${title} distribution`}
      />
      <div className="score-ranges" aria-label={`${title} filter`}>
        {['All scores', '1', '2–29', '30–79', '80–99'].map((range) => (
          <button
            type="button"
            aria-pressed={selected === range}
            onClick={() => onSelect(range)}
            key={range}
          >
            <i style={{ background: accent }} />
            {range}
          </button>
        ))}
      </div>
    </section>
  )
}

function WorkerMetric({
  label,
  value,
  detail,
  definition,
  danger,
}: {
  label: string
  value: string
  detail: string
  definition: ReturnType<typeof sparklineDefinition>
  danger?: boolean
}) {
  return (
    <section className="worker-metric">
      <header>
        <span>{label}</span>
        <button type="button">•••</button>
      </header>
      <div>
        <strong>{value}</strong>
        <small data-danger={danger || undefined}>{detail}</small>
      </div>
      <SpringChart
        definition={definition}
        height={76}
        initialWidth={360}
        ariaLabel={`${label} trend`}
      />
    </section>
  )
}

function QuantileLegend() {
  return (
    <div className="quantile-legend">
      {[
        ['P50', '#1f9d68'],
        ['P90', '#0051c3'],
        ['P99', '#6d5bd0'],
        ['P99.9', '#d97706'],
      ].map(([label, color]) => (
        <span key={label}>
          <i style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function DonutLegend({
  rows,
}: {
  rows: readonly (readonly [string, string, string])[]
}) {
  return (
    <div className="donut-legend">
      {rows.map(([label, value, color]) => (
        <span key={label}>
          <i style={{ background: color }} />
          {label}
          <strong>{value}</strong>
        </span>
      ))}
    </div>
  )
}

function GatewayLegend({ provider }: { provider: GatewayProvider | 'All' }) {
  const rows = [
    ['OpenAI', '#1f9d68'],
    ['Anthropic', '#d97706'],
    ['Workers AI', '#6d5bd0'],
  ] as const
  return (
    <div className="quantile-legend">
      {rows
        .filter(([label]) => provider === 'All' || label === provider)
        .map(([label, color]) => (
          <span key={label}>
            <i style={{ background: color }} />
            {label}
          </span>
        ))}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className="status-pill"
      data-status={status.toLowerCase().replace(' ', '-')}
    >
      {status}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="score-badge"
      data-risk={score < 10 ? 'high' : score < 50 ? 'medium' : 'low'}
    >
      {score}
    </span>
  )
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="toast" role="status">
      {children}
    </div>
  )
}

function useNoticeTimer(notice: string, setNotice: (value: string) => void) {
  React.useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2200)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])
}

function scoreInRange(score: number, range: string) {
  if (range === '1') return score === 1
  if (range === '2–29') return score >= 2 && score <= 29
  if (range === '30–79') return score >= 30 && score <= 79
  if (range === '80–99') return score >= 80
  return true
}

const securityEvents = [
  {
    time: '11:58:41',
    action: 'Block',
    client: '203.0.113.42',
    host: 'api.example.com',
    path: '/v1/auth/token',
    score: 1,
    source: 'Managed rules',
  },
  {
    time: '11:58:32',
    action: 'Managed Challenge',
    client: '198.51.100.18',
    host: 'example.com',
    path: '/account/login',
    score: 7,
    source: 'Bot management',
  },
  {
    time: '11:58:09',
    action: 'Allow',
    client: '192.0.2.91',
    host: 'example.com',
    path: '/products/edge',
    score: 86,
    source: 'Custom rules',
  },
  {
    time: '11:57:54',
    action: 'Block',
    client: '203.0.113.77',
    host: 'api.example.com',
    path: '/graphql',
    score: 3,
    source: 'Rate limiting',
  },
  {
    time: '11:57:28',
    action: 'Managed Challenge',
    client: '198.51.100.64',
    host: 'example.com',
    path: '/search?q=...',
    score: 26,
    source: 'Managed rules',
  },
  {
    time: '11:56:47',
    action: 'Allow',
    client: '192.0.2.34',
    host: 'api.example.com',
    path: '/v1/status',
    score: 94,
    source: 'Skip rule',
  },
] as const

const gatewayProviders = [
  {
    provider: 'OpenAI',
    requests: '1.59M',
    tokens: '2.03B',
    p50: '842 ms',
    p95: '3.12 s',
    error: '0.82%',
    cost: '$614.54',
    color: '#1f9d68',
  },
  {
    provider: 'Anthropic',
    requests: '985K',
    tokens: '1.83B',
    p50: '1.14 s',
    p95: '4.08 s',
    error: '1.06%',
    cost: '$351.10',
    color: '#d97706',
  },
  {
    provider: 'Workers AI',
    requests: '735K',
    tokens: '418M',
    p50: '328 ms',
    p95: '1.21 s',
    error: '2.04%',
    cost: '$84.26',
    color: '#6d5bd0',
  },
] as const
