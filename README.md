# Cloudflare × TanStack Charts

A high-fidelity, interactive reproduction of Cloudflare visualization surfaces implemented with [TanStack Charts](https://github.com/TanStack/charts).

**[Open the live demo](https://cloudflare-tanstack-charts-demo.thetanstack.workers.dev)**

The demo includes:

- Custom Dashboard traffic analytics
- Security Analytics with coordinated filtering and request evidence
- Workers topology, runtime telemetry, quantiles, deployment annotations, and distributions
- AI Gateway provider, token, cost, cache, and reliability analytics
- Cloudflare Radar traffic and protocol compositions

All account names, domains, metrics, IP addresses, events, and deployments are deterministic synthetic fixtures. This project is not an official Cloudflare product.

## Run locally

```sh
npm install
npm run cf-typegen
npm run dev
```

## Validate

```sh
npm run check
```

## Deploy as a Cloudflare Worker

The Worker serves the Vite production build through Cloudflare Static Assets and exposes `GET /health`.

```sh
npm run deploy
```

## License

MIT
