import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const stylesPath = join(process.cwd(), 'src', 'app', 'styles', 'index.css')
const styles = readFileSync(stylesPath, 'utf8')

const token = (name: string): string | undefined =>
  new RegExp(`--color-${name}:\\s*([^;]+);`).exec(styles)?.[1]?.trim()

describe('design tokens', () => {
  it.each([
    ['canvas', '#0b1215'],
    ['surface', '#131d22'],
    ['surface-raised', '#152026'],
    ['surface-subtle', '#152026'],
    ['border', '#23323a'],
    ['border-strong', '#5b6b73'],
    ['text', '#f3f4f6'],
    ['text-muted', '#8b9ba3'],
    ['text-inverse', '#0b1215'],
    ['primary', '#34d399'],
    ['primary-strong', '#10b981'],
    ['success', '#34d399'],
    ['warning', '#fbbf24'],
    ['danger', '#f87171'],
    ['focus', '#34d399'],
    ['tag-border', '#2a3b44'],
    ['tag-text', '#9ca3af'],
  ])('defines %s with the canonical value', (name, value) => {
    expect(token(name)?.toLowerCase()).toBe(value)
  })

  it('never uses pure black as the canvas', () => {
    expect(token('canvas')?.toLowerCase()).not.toBe('#000000')
    expect(token('canvas')?.toLowerCase()).not.toBe('#000')
  })

  it('defines the shared radii and spacing scale', () => {
    expect(styles).toContain('--radius-card: 1rem')
    expect(styles).toContain('--radius-control: 0.5rem')
    expect(styles).toContain('--spacing-page: 1rem')
    expect(styles).toContain('--spacing-page-sm: 1.5rem')
    expect(styles).toContain('--spacing-section: 1.5rem')
  })

  it('self-hosts Inter and respects reduced motion', () => {
    expect(styles).toContain("@import '@fontsource-variable/inter'")
    expect(styles).toContain('prefers-reduced-motion: reduce')
    expect(styles).toContain('tabular-nums')
  })
})
