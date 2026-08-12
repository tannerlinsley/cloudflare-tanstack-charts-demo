export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' })
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
