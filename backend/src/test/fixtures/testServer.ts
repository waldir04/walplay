import type { Server } from 'node:http'

export interface TestServer {
  readonly baseUrl: string
  readonly close: () => Promise<void>
}

export const startTestServer = async (app: {
  listen: (port: number) => Server
}): Promise<TestServer> => {
  const server = app.listen(0)

  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve())
    server.once('error', reject)
  })

  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Could not determine test server address.')
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      }),
  }
}
