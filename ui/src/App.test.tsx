import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button>Sign in with Google</button>,
}))

describe('App', () => {
  afterEach(cleanup)

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('presents Google-only sign in', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByText(/@gmail.com accounts only/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue as local developer/i })).not.toBeInTheDocument()
  })

  it('toggles and persists the dark theme', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /use dark theme/i }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('archly-theme')).toBe('dark')
  })

  it('does not initialize Google sign-in when it is not configured', () => {
    render(<App googleEnabled={false} />)
    expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument()
  })
})
