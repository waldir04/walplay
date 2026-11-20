import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import en from './en.json'
import es from './es.json'

type ResourceNode = { [key: string]: string | ResourceNode }

const flattenKeys = (node: ResourceNode, prefix = ''): string[] =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix.length === 0 ? key : `${prefix}.${key}`
    return typeof value === 'string' ? [path] : flattenKeys(value, path)
  })

const getValue = (node: ResourceNode, key: string): string | undefined => {
  const segments = key.split('.')
  let current: ResourceNode | string | undefined = node
  for (const segment of segments) {
    if (typeof current === 'string' || current === undefined) {
      return undefined
    }
    current = current[segment]
  }
  return typeof current === 'string' ? current : undefined
}

const collectSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) {
      return collectSourceFiles(path)
    }
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) ? [path] : []
  })

describe('translation resources', () => {
  it('exposes identical leaf-key sets in English and Spanish', () => {
    expect(flattenKeys(es).sort()).toEqual(flattenKeys(en).sort())
  })

  it('contains no empty strings', () => {
    const emptyKeys = [...flattenKeys(en), ...flattenKeys(es)].filter(
      (key) =>
        (getValue(en, key) ?? '').trim().length === 0 ||
        (getValue(es, key) ?? '').trim().length === 0
    )

    expect(emptyKeys).toEqual([])
  })

  it('keeps the brand name and language endonyms stable', () => {
    expect(en.app.name).toBe('Walplay')
    expect(es.app.name).toBe('Walplay')
    expect(en.languages).toEqual({ en: 'English', es: 'Español' })
    expect(es.languages).toEqual({ en: 'English', es: 'Español' })
  })

  it('only references translation keys that exist in both locales', () => {
    const files = collectSourceFiles(join(process.cwd(), 'src'))
    const keyPattern = /\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g
    const referenced = new Set<string>()

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(keyPattern)) {
        const key = match[1]
        if (key) {
          referenced.add(key)
        }
      }
    }

    expect(files.length).toBeGreaterThan(0)
    expect(referenced.size).toBeGreaterThan(0)

    const missing = [...referenced].filter(
      (key) => getValue(en, key) === undefined || getValue(es, key) === undefined
    )

    expect(missing).toEqual([])
  })

  it('reports scanned files relative to the project root for debugging', () => {
    const files = collectSourceFiles(join(process.cwd(), 'src'))
    const relativeFiles = files.map((file) => relative(process.cwd(), file))

    expect(relativeFiles).toContain(join('src', 'app', 'App.tsx'))
  })
})
