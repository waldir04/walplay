import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { ExpandableText } from './ExpandableText'
import { renderWithProviders } from '@/test/renderWithProviders'

const longText = `${'A long overview sentence. '.repeat(40)}`

describe('ExpandableText', () => {
  it('renders short text without an expand control', async () => {
    const { container } = await renderWithProviders(
      <ExpandableText
        text="Short overview."
        previewCodePoints={600}
        showMoreLabel="Show more"
        showLessLabel="Show less"
      />
    )
    expect(container).toHaveTextContent('Short overview.')
    expect(container.querySelector('button')).toBeNull()
  })

  it('keeps the complete text in the DOM and clamps it visually', async () => {
    const { container } = await renderWithProviders(
      <ExpandableText
        text={longText}
        previewCodePoints={100}
        showMoreLabel="Show more"
        showLessLabel="Show less"
      />
    )
    const paragraph = container.querySelector('p')
    expect(paragraph?.textContent).toBe(longText)
    expect(paragraph?.className).toContain('line-clamp-6')
  })

  it('toggles aria-expanded and localized labels from the keyboard', async () => {
    const { getByRole } = await renderWithProviders(
      <ExpandableText
        text={longText}
        previewCodePoints={100}
        showMoreLabel="Show more"
        showLessLabel="Show less"
      />
    )
    const control = getByRole('button', { name: 'Show more' })
    expect(control).toHaveAttribute('aria-expanded', 'false')
    control.focus()
    await userEvent.click(control)
    expect(getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(getByRole('button', { name: 'Show less' }))
    expect(getByRole('button', { name: 'Show more' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('counts code points rather than UTF-16 units', async () => {
    const emojiText = '😀'.repeat(3)
    const { container } = await renderWithProviders(
      <ExpandableText
        text={emojiText}
        previewCodePoints={2}
        showMoreLabel="Show more"
        showLessLabel="Show less"
      />
    )
    expect(container.querySelector('button')).not.toBeNull()
  })

  it('preserves provider line breaks', async () => {
    const { container } = await renderWithProviders(
      <ExpandableText
        text={'Line one\nLine two'}
        previewCodePoints={600}
        showMoreLabel="Show more"
        showLessLabel="Show less"
      />
    )
    expect(container.querySelector('p')?.className).toContain('whitespace-pre-line')
  })
})
