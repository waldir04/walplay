import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PageImporter, PageModule } from './usePageModule'
import { usePageModule } from './usePageModule'

const Page = () => null

const deferredModule = () => {
  let resolve: (module: PageModule) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<PageModule>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('usePageModule', () => {
  it('moves from loading to ready when the importer resolves', async () => {
    const deferred = deferredModule()
    const importer: PageImporter = vi.fn(() => deferred.promise)

    const { result } = renderHook(() => usePageModule(importer))

    expect(result.current.status).toBe('loading')

    await act(async () => {
      deferred.resolve({ default: Page })
      await deferred.promise
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.Component).toBe(Page)
  })

  it('moves from loading to error when the importer rejects', async () => {
    const deferred = deferredModule()
    const importer: PageImporter = vi.fn(() => deferred.promise)

    const { result } = renderHook(() => usePageModule(importer))

    await act(async () => {
      deferred.reject(new Error('chunk failed'))
      await deferred.promise.catch(() => undefined)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.Component).toBeNull()
  })

  it('returns to loading on retry and re-invokes the importer', async () => {
    const firstAttempt = deferredModule()
    const secondAttempt = deferredModule()
    const importer: PageImporter = vi
      .fn<PageImporter>()
      .mockImplementationOnce(() => firstAttempt.promise)
      .mockImplementationOnce(() => secondAttempt.promise)

    const { result } = renderHook(() => usePageModule(importer))

    await act(async () => {
      firstAttempt.reject(new Error('chunk failed'))
      await firstAttempt.promise.catch(() => undefined)
    })
    expect(result.current.status).toBe('error')

    await act(async () => {
      result.current.retry()
    })

    expect(result.current.status).toBe('loading')
    expect(importer).toHaveBeenCalledTimes(2)

    await act(async () => {
      secondAttempt.resolve({ default: Page })
      await secondAttempt.promise
    })
  })

  it('renders the page when a retry succeeds', async () => {
    const firstAttempt = deferredModule()
    const secondAttempt = deferredModule()
    const importer: PageImporter = vi
      .fn<PageImporter>()
      .mockImplementationOnce(() => firstAttempt.promise)
      .mockImplementationOnce(() => secondAttempt.promise)

    const { result } = renderHook(() => usePageModule(importer))

    await act(async () => {
      firstAttempt.reject(new Error('first failure'))
      await firstAttempt.promise.catch(() => undefined)
    })

    await act(async () => {
      result.current.retry()
    })

    await act(async () => {
      secondAttempt.resolve({ default: Page })
      await secondAttempt.promise
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.Component).toBe(Page)
  })

  it('shows the error again when a retry fails', async () => {
    const firstAttempt = deferredModule()
    const secondAttempt = deferredModule()
    const importer: PageImporter = vi
      .fn<PageImporter>()
      .mockImplementationOnce(() => firstAttempt.promise)
      .mockImplementationOnce(() => secondAttempt.promise)

    const { result } = renderHook(() => usePageModule(importer))

    await act(async () => {
      firstAttempt.reject(new Error('first failure'))
      await firstAttempt.promise.catch(() => undefined)
    })
    await act(async () => {
      result.current.retry()
    })
    await act(async () => {
      secondAttempt.reject(new Error('second failure'))
      await secondAttempt.promise.catch(() => undefined)
    })

    expect(result.current.status).toBe('error')
  })

  it('ignores a settled attempt from an unmounted route', async () => {
    const deferred = deferredModule()
    const importer: PageImporter = vi.fn(() => deferred.promise)

    const { unmount } = renderHook(() => usePageModule(importer))
    unmount()

    await act(async () => {
      deferred.reject(new Error('late failure'))
      await deferred.promise.catch(() => undefined)
    })

    expect(importer).toHaveBeenCalledTimes(1)
  })
})
