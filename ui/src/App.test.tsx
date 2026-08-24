import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApiError } from './api'

const apiMocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
}))

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>()
  return { ...original, api: { ...original.api, validateSession: apiMocks.validateSession } }
})

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (response: { credential: string }) => void }) =>
    <button onClick={() => onSuccess({ credential: 'google-credential' })}>Sign in with Google</button>,
}))

describe('App', () => {
  afterEach(cleanup)

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    apiMocks.validateSession.mockReset()
    apiMocks.validateSession.mockResolvedValue({ email: 'owner@gmail.com' })
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

  it('keeps a rejected Google identity signed out and explains the Gmail policy', async () => {
    apiMocks.validateSession.mockRejectedValue(new ApiError(
      'Archly supports only verified personal @gmail.com accounts.', 401))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only verified personal @gmail.com accounts are supported. Google Workspace and other email domains cannot sign in.')
    expect(screen.getByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
  })
})
