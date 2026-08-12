import * as React from 'react'
import { Chart as CanvasChart } from '@tanstack/charts/react/canvas'
import {
  bandwidthSeries,
  cacheSeries,
  countryGlobeDefinition,
  dashboardTrafficDefinition,
  protocolGaugeDefinition,
  radarTrafficDefinition,
  requestSeries,
  sparklineDefinition,
  threatSeries,
  topCountries,
  type DashboardInterval,
  type RadarSeriesVisibility,
} from './charts'
import { ProductSurface, type ProductScreen } from './ProductScreens'

type Surface = 'dashboard' | ProductScreen | 'radar'
type TimeRange = 1 | 7

const intervals: readonly DashboardInterval[] = [
  'Auto',
  '5 minutes',
  '15 minutes',
  '1 hour',
  '1 day',
]

const metricCharts = {
  requests: sparklineDefinition(requestSeries),
  bandwidth: sparklineDefinition(bandwidthSeries),
  cache: sparklineDefinition(cacheSeries),
  threats: sparklineDefinition(threatSeries),
}

const protocolGauge = protocolGaugeDefinition()

export function App() {
  const [surface, setSurface] = React.useState<Surface>('dashboard')

  return (
    <div className={`app app--${surface}`}>
      <Sidebar surface={surface} setSurface={setSurface} />
      <div className="workspace">
        <TopBar surface={surface} />
        <main className="main">
          {surface === 'dashboard' ? (
            <Dashboard />
          ) : surface === 'radar' ? (
            <Radar />
          ) : (
            <ProductSurface screen={surface} />
          )}
        </main>
      </div>
    </div>
  )
}

function Sidebar({
  surface,
  setSurface,
}: {
  surface: Surface
  setSurface: React.Dispatch<React.SetStateAction<Surface>>
}) {
  const links: Record<Surface, readonly { label: string; active?: boolean }[]> =
    {
      dashboard: [
        { label: 'Account Home' },
        { label: 'Websites' },
        { label: 'Analytics & Logs', active: true },
        { label: 'Security Center' },
        { label: 'Manage Account' },
      ],
      security: [
        { label: 'Overview' },
        { label: 'Security Analytics', active: true },
        { label: 'Events' },
        { label: 'WAF' },
        { label: 'Bots' },
        { label: 'DDoS' },
      ],
      workers: [
        { label: 'Workers & Pages' },
        { label: 'Overview' },
        { label: 'Metrics', active: true },
        { label: 'Deployments' },
        { label: 'Bindings' },
        { label: 'Observability' },
      ],
      'ai-gateway': [
        { label: 'Workers AI' },
        { label: 'AI Gateway', active: true },
        { label: 'Analytics' },
        { label: 'Logs' },
        { label: 'Evaluations' },
        { label: 'Settings' },
      ],
      radar: [
        { label: 'Overview', active: true },
        { label: 'Adoption & Usage' },
        { label: 'AI Insights' },
        { label: 'Security' },
        { label: 'Outage Center' },
      ],
    }
  const demoScreens: readonly { label: string; value: Surface }[] = [
    { label: 'Overview', value: 'dashboard' },
    { label: 'Security', value: 'security' },
    { label: 'Workers', value: 'workers' },
    { label: 'AI Gateway', value: 'ai-gateway' },
    { label: 'Radar', value: 'radar' },
  ]

  return (
    <aside className="sidebar">
      <div className="brand" aria-label="Cloudflare">
        <span className="brand__flare" aria-hidden="true" />
        <strong>
          {surface === 'radar' ? 'Cloudflare Radar' : 'Cloudflare'}
        </strong>
      </div>
      <div className="surface-switch" aria-label="Demo screen">
        {demoScreens.map((item) => (
          <button
            type="button"
            aria-pressed={surface === item.value}
            onClick={() => setSurface(item.value)}
            key={item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
      <nav className="nav" aria-label={`${surface} navigation`}>
        {links[surface].map((item) => (
          <button
            className="nav__item"
            data-active={item.active || undefined}
            type="button"
            key={item.label}
          >
            <span className="nav__glyph" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <strong>TanStack Charts</strong>
        <span>Synthetic Cloudflare fixture</span>
      </div>
    </aside>
  )
}

function TopBar({ surface }: { surface: Surface }) {
  if (surface === 'radar') {
    return (
      <header className="topbar topbar--radar">
        <label className="search">
          <span className="sr-only">Search Radar</span>
          <input placeholder="Search locations, systems, reports, and domains" />
        </label>
        <div className="topbar__actions">
          <button type="button">English</button>
          <button className="ask-ai" type="button">
            Ask AI <small>Beta</small>
          </button>
          <button type="button" aria-label="Change color theme">
            Theme
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="topbar">
      <button className="account-switcher" type="button">
        Demo account <span aria-hidden="true">⌄</span>
      </button>
      <div className="topbar__actions">
        <button className="ask-ai" type="button">
          Ask AI
        </button>
        <button type="button">Support</button>
        <button type="button" aria-label="Open profile menu">
          TL
        </button>
      </div>
    </header>
  )
}

function Dashboard() {
  const [scope, setScope] = React.useState('All zones')
  const [interval, setInterval] = React.useState<DashboardInterval>('Auto')
  const [days, setDays] = React.useState<TimeRange>(1)
  const [live, setLive] = React.useState(false)
  const [revision, setRevision] = React.useState(0)
  const [chartVisible, setChartVisible] = React.useState(true)
  const [duplicates, setDuplicates] = React.useState(0)
  const [configureOpen, setConfigureOpen] = React.useState(false)
  const [notice, setNotice] = React.useState('')

  React.useEffect(() => {
    if (!live) return
    const timer = window.setInterval(
      () => setRevision((value) => value + 1),
      3500,
    )
    return () => window.clearInterval(timer)
  }, [live])

  React.useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const trafficChart = React.useMemo(
    () => dashboardTrafficDefinition({ revision, interval, days }),
    [days, interval, revision],
  )

  const addChart = () => {
    if (!chartVisible) setChartVisible(true)
    else setDuplicates((value) => value + 1)
    setNotice('Chart added')
  }

  return (
    <>
      <div className="breadcrumbs">Account / Dashboards / Traffic overview</div>
      <header className="page-heading">
        <div>
          <h1>Traffic overview</h1>
          <p>
            Monitor requests, bandwidth, cache performance, and security events.
          </p>
        </div>
        <div className="toolbar toolbar--primary">
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" onClick={() => void copyLink(setNotice)}>
            Copy link
          </button>
          <button className="button--primary" type="button" onClick={addChart}>
            Add a chart
          </button>
        </div>
      </header>

      <div className="dashboard-filters" aria-label="Dashboard controls">
        <details className="menu menu--filter">
          <summary>Add filter</summary>
          <div className="menu__popover">
            <span className="menu__label">Scope</span>
            {['All zones', 'example.com', 'api.example.com'].map((option) => (
              <button
                type="button"
                data-selected={scope === option || undefined}
                onClick={() => setScope(option)}
                key={option}
              >
                {option}
              </button>
            ))}
          </div>
        </details>
        <button
          className="live-button"
          data-active={live || undefined}
          type="button"
          onClick={() => setLive((value) => !value)}
        >
          <i aria-hidden="true" /> Live refresh {live ? 'on' : 'off'}
        </button>
        <select
          aria-label="Dashboard time range"
          value={days}
          onChange={(event) => setDays(Number(event.target.value) as TimeRange)}
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
        </select>
      </div>

      <div className="metrics">
        <MetricCard
          label="Requests"
          value="182.4M"
          change="12.8%"
          definition={metricCharts.requests}
        />
        <MetricCard
          label="Bandwidth"
          value="28.4 TB"
          change="8.4%"
          definition={metricCharts.bandwidth}
        />
        <MetricCard
          label="Cache ratio"
          value="88.2%"
          change="1.6%"
          definition={metricCharts.cache}
        />
        <MetricCard
          label="Blocked threats"
          value="612K"
          change="6.1%"
          definition={metricCharts.threats}
        />
      </div>

      {chartVisible && (
        <DashboardTimeseries
          chart={trafficChart}
          interval={interval}
          setInterval={setInterval}
          scope={scope}
          onConfigure={() => setConfigureOpen(true)}
          onDuplicate={() => {
            setDuplicates((value) => value + 1)
            setNotice('Chart duplicated')
          }}
          onRemove={() => {
            setChartVisible(false)
            setNotice('Chart removed')
          }}
        />
      )}

      {Array.from({ length: duplicates }, (_, index) => (
        <DashboardTimeseries
          key={`duplicate-${index}`}
          chart={trafficChart}
          interval={interval}
          setInterval={setInterval}
          scope={scope}
          duplicate={index + 1}
          onConfigure={() => setConfigureOpen(true)}
          onDuplicate={() => setDuplicates((value) => value + 1)}
          onRemove={() => setDuplicates((value) => Math.max(0, value - 1))}
        />
      ))}

      <CountryContract />

      {configureOpen && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="config-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="configure-chart-title"
          >
            <header>
              <h2 id="configure-chart-title">Configure Requests over time</h2>
              <button
                type="button"
                aria-label="Close configuration"
                onClick={() => setConfigureOpen(false)}
              >
                ×
              </button>
            </header>
            <label>
              Scope
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option>All zones</option>
                <option>example.com</option>
                <option>api.example.com</option>
              </select>
            </label>
            <label>
              Interval
              <select
                value={interval}
                onChange={(event) =>
                  setInterval(event.target.value as DashboardInterval)
                }
              >
                {intervals.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <footer>
              <button type="button" onClick={() => setConfigureOpen(false)}>
                Cancel
              </button>
              <button
                className="button--primary"
                type="button"
                onClick={() => {
                  setConfigureOpen(false)
                  setNotice('Chart configuration saved')
                }}
              >
                Save
              </button>
            </footer>
          </section>
        </div>
      )}

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  )
}

function DashboardTimeseries({
  chart,
  interval,
  setInterval,
  scope,
  duplicate,
  onConfigure,
  onDuplicate,
  onRemove,
}: {
  chart: ReturnType<typeof dashboardTrafficDefinition>
  interval: DashboardInterval
  setInterval: React.Dispatch<React.SetStateAction<DashboardInterval>>
  scope: string
  duplicate?: number
  onConfigure: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  return (
    <section className="card card--wide dashboard-timeseries">
      <CardHeader
        title={`Requests over time${duplicate ? ` copy ${duplicate}` : ''}`}
        aside={
          <ChartMenu
            interval={interval}
            setInterval={setInterval}
            scope={scope}
            onConfigure={onConfigure}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
          />
        }
      />
      <div className="dashboard-legend">
        <span>
          <i /> Requests
        </span>
        <strong>182.4M</strong>
      </div>
      <div className="chart-frame chart-frame--dashboard">
        <CanvasChart
          definition={chart}
          height={326}
          initialWidth={1080}
          ariaLabel="Requests over time"
          ariaDescription="Complete requests are solid. Incomplete boundary periods are dashed and the latest period is hatched."
        />
      </div>
    </section>
  )
}

function ChartMenu({
  interval,
  setInterval,
  scope,
  onConfigure,
  onDuplicate,
  onRemove,
}: {
  interval: DashboardInterval
  setInterval: React.Dispatch<React.SetStateAction<DashboardInterval>>
  scope: string
  onConfigure: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  return (
    <details className="menu chart-menu">
      <summary aria-label="Chart actions">•••</summary>
      <div className="menu__popover menu__popover--chart">
        <div className="menu__section">
          <span className="menu__label">Set scope</span>
          <span className="menu__value">{scope}</span>
        </div>
        <div className="menu__section">
          <span className="menu__label">Interval</span>
          {intervals.map((option) => (
            <button
              type="button"
              data-selected={interval === option || undefined}
              onClick={() => setInterval(option)}
              key={option}
            >
              <span>{option}</span>
              {interval === option && <strong aria-label="Selected">✓</strong>}
            </button>
          ))}
        </div>
        <div className="menu__section menu__section--actions">
          <button type="button" onClick={onConfigure}>
            Configure
          </button>
          <button type="button" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </details>
  )
}

function CountryContract() {
  return (
    <section className="card country-card">
      <CardHeader
        title="Requests by Country"
        aside={
          <details className="menu chart-menu">
            <summary aria-label="Chart actions">•••</summary>
            <div className="menu__popover menu__popover--compact">
              <button type="button">Configure</button>
              <button type="button">Duplicate</button>
            </div>
          </details>
        }
      />
      <div className="country-contract">
        <div className="globe-wrap">
          <CanvasChart
            definition={countryGlobeDefinition}
            height={320}
            initialWidth={560}
            ariaLabel="Requests by country globe"
          />
        </div>
        <div className="top-list">
          <header>
            <strong>Top countries</strong>
            <span>Requests</span>
          </header>
          <ol>
            {topCountries.map((country, index) => (
              <li key={country.label}>
                <span className="rank">{index + 1}</span>
                <div>
                  <span className="country-row__label">{country.label}</span>
                  <span className="progress" aria-hidden="true">
                    <i
                      style={{
                        width: `${(country.value / topCountries[0].value) * 100}%`,
                      }}
                    />
                  </span>
                </div>
                <strong>{country.requests}</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Radar() {
  const [location, setLocation] = React.useState('Worldwide')
  const [trafficType, setTrafficType] = React.useState('Total & HTTP bytes')
  const [visibility, setVisibility] = React.useState<RadarSeriesVisibility>({
    total: true,
    http: true,
    previous: true,
  })
  const [notice, setNotice] = React.useState('')
  const chartRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const radarChart = React.useMemo(
    () => radarTrafficDefinition(visibility),
    [visibility],
  )

  const setType = (value: string) => {
    setTrafficType(value)
    setVisibility((current) => ({
      total: value !== 'HTTP bytes',
      http: value !== 'Total bytes',
      previous: current.previous,
    }))
  }

  const toggleSeries = (key: keyof RadarSeriesVisibility) => {
    setVisibility((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <>
      <header className="radar-heading">
        <div>
          <div className="breadcrumbs">Radar / Overview</div>
          <h1>Overview</h1>
        </div>
        <div className="radar-heading__filters">
          <label>
            <span className="sr-only">Location</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option>Worldwide</option>
              <option>United States</option>
              <option>Germany</option>
              <option>Brazil</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Date range</span>
            <select defaultValue="Last 7 days">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </label>
        </div>
      </header>

      <section className="radar-card">
        <header className="radar-card__header">
          <div>
            <h2>Traffic trends</h2>
            <p>
              Internet traffic trends for <a href="#location">{location}</a>.
            </p>
          </div>
          <div className="radar-card__actions">
            <details className="menu help-menu">
              <summary aria-label="About this chart">?</summary>
              <div className="menu__popover menu__popover--help">
                Traffic is normalized to the maximum value in the selected
                period.
              </div>
            </details>
            <button type="button" onClick={() => void copyLink(setNotice)}>
              Share
            </button>
            <details className="menu chart-menu">
              <summary aria-label="More chart actions">•••</summary>
              <div className="menu__popover menu__popover--compact">
                <button
                  type="button"
                  onClick={() => downloadChart(chartRef.current, setNotice)}
                >
                  Download PNG
                </button>
                <button type="button" onClick={() => void copyLink(setNotice)}>
                  Copy link
                </button>
              </div>
            </details>
          </div>
        </header>

        <div className="radar-card__controls">
          <label>
            Traffic type
            <select
              value={trafficType}
              onChange={(event) => setType(event.target.value)}
            >
              <option>Total &amp; HTTP bytes</option>
              <option>Total bytes</option>
              <option>HTTP bytes</option>
            </select>
          </label>
        </div>

        <div className="radar-contract">
          <div className="radar-traffic" ref={chartRef} data-radar-chart>
            <div className="radar-series" aria-label="Toggle chart series">
              <SeriesButton
                label="Total bytes"
                color="#0055b8"
                pressed={visibility.total}
                onClick={() => toggleSeries('total')}
              />
              <SeriesButton
                label="HTTP bytes"
                color="#00a7c7"
                pressed={visibility.http}
                onClick={() => toggleSeries('http')}
              />
              <SeriesButton
                label="Previous 7 days"
                color="#929aa5"
                dashed
                pressed={visibility.previous}
                onClick={() => toggleSeries('previous')}
              />
            </div>
            <div className="chart-frame chart-frame--radar">
              <CanvasChart
                definition={radarChart}
                height={305}
                initialWidth={760}
                ariaLabel="Worldwide traffic trends"
                ariaDescription="Total bytes, HTTP bytes, and the previous seven day comparison. The latest period is incomplete."
              />
            </div>
          </div>

          <section className="protocol-panel" aria-labelledby="protocol-title">
            <h3 id="protocol-title">Protocols</h3>
            <div className="protocol-values">
              <span>
                <i className="protocol-http" /> HTTP <strong>73.2%</strong>
              </span>
              <span>
                <i className="protocol-other" /> Other <strong>26.8%</strong>
              </span>
            </div>
            <CanvasChart
              definition={protocolGauge}
              height={190}
              initialWidth={300}
              ariaLabel="Protocol traffic share"
            />
          </section>
        </div>
      </section>

      <div className="radar-summary-grid">
        <DistributionPanel
          title="Traffic"
          subtitle="Bot vs Human"
          first="Bot"
          firstValue={60.3}
          second="Human"
          secondValue={39.7}
        />
        <DistributionPanel
          title="Adoption & Usage"
          subtitle="IP versions"
          first="IPv4"
          firstValue={59.2}
          second="IPv6"
          secondValue={40.8}
        />
      </div>

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  )
}

function SeriesButton({
  label,
  color,
  pressed,
  dashed = false,
  onClick,
}: {
  label: string
  color: string
  pressed: boolean
  dashed?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}>
      <i
        style={dashed ? { borderColor: color } : { background: color }}
        data-dashed={dashed || undefined}
      />
      {label}
    </button>
  )
}

function DistributionPanel({
  title,
  subtitle,
  first,
  firstValue,
  second,
  secondValue,
}: {
  title: string
  subtitle: string
  first: string
  firstValue: number
  second: string
  secondValue: number
}) {
  return (
    <section className="summary-card">
      <h2>{title}</h2>
      <h3>{subtitle}</h3>
      <div className="summary-values">
        <span>
          {first} <strong>{firstValue}%</strong>
        </span>
        <span>
          {second} <strong>{secondValue}%</strong>
        </span>
      </div>
      <div
        className="summary-bar"
        role="img"
        aria-label={`${first} ${firstValue}%, ${second} ${secondValue}%`}
      >
        <i style={{ width: `${firstValue}%` }} />
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  change,
  definition,
}: {
  label: string
  value: string
  change: string
  definition: ReturnType<typeof sparklineDefinition>
}) {
  return (
    <section className="metric-card">
      <header>
        <span>{label}</span>
        <details className="menu chart-menu">
          <summary aria-label={`${label} chart actions`}>•••</summary>
          <div className="menu__popover menu__popover--compact">
            <button type="button">Configure</button>
            <button type="button">Duplicate</button>
          </div>
        </details>
      </header>
      <div className="metric-card__value">
        <strong>{value}</strong>
        <span>↑ {change}</span>
      </div>
      <CanvasChart
        definition={definition}
        height={62}
        initialWidth={280}
        ariaLabel={`${label} trend`}
      />
    </section>
  )
}

function CardHeader({
  title,
  aside,
}: {
  title: string
  aside?: React.ReactNode
}) {
  return (
    <header className="card__header">
      <h2>{title}</h2>
      {aside}
    </header>
  )
}

async function copyLink(setNotice: (value: string) => void) {
  try {
    await navigator.clipboard.writeText(window.location.href)
    setNotice('Link copied')
  } catch {
    setNotice('Copy is unavailable in this browser')
  }
}

function downloadChart(
  container: HTMLDivElement | null,
  setNotice: (value: string) => void,
) {
  const canvas = container?.querySelector('canvas')
  if (!canvas) {
    setNotice('Chart image is not available')
    return
  }
  const link = document.createElement('a')
  link.download = 'cloudflare-radar-traffic.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
  setNotice('Chart downloaded')
}
