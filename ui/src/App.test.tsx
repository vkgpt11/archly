import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApiError } from './api'

const apiMocks = vi.hoisted(() => ({
  validateSession: vi.fn(),
  restoreSession: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('./api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api')>()
  return { ...original, api: { ...original.api, validateSession: apiMocks.validateSession, restoreSession: apiMocks.restoreSession, logout: apiMocks.logout } }
})

vi.mock('./components/Dashboard', () => ({
  default: ({ onSignOut }: { onSignOut: () => void }) => <main><h1>Restored dashboard</h1><button onClick={onSignOut}>Sign out</button></main>,
}))

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (response: { credential: string }) => void }) =>
    <button onClick={() => onSuccess({ credential: 'google-credential' })}>Sign in with Google</button>,
}))

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    apiMocks.validateSession.mockReset()
    apiMocks.validateSession.mockResolvedValue({ email: 'owner@gmail.com' })
    apiMocks.restoreSession.mockReset()
    apiMocks.restoreSession.mockRejectedValue(new ApiError('No session', 401))
    apiMocks.logout.mockReset()
    apiMocks.logout.mockResolvedValue(undefined)
  })

  it('presents Google-only sign in', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByText(/@gmail.com accounts only/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue as local developer/i })).not.toBeInTheDocument()
  })

  it('toggles and persists the dark theme', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /use dark theme/i }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('archly-theme')).toBe('dark')
  })

  it('does not initialize Google sign-in when it is not configured', async () => {
    render(<App googleEnabled={false} />)
    expect(await screen.findByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument()
  })

  it('keeps a rejected Google identity signed out and explains the Gmail policy', async () => {
    apiMocks.validateSession.mockRejectedValue(new ApiError(
      'Archly supports only verified personal @gmail.com accounts.', 401))
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /sign in with google/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only verified personal @gmail.com accounts are supported. Google Workspace and other email domains cannot sign in.')
    expect(screen.getByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
  })

  it('explains how to recover when local developer sign-in fails', async () => {
    vi.stubEnv('VITE_DEV_AUTH', 'true')
    apiMocks.validateSession.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /continue as local developer/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Local developer sign-in failed. Start the API with ARCHLY_AUTH_DEV_BYPASS=true and try again.')
  })

  it('restores an authenticated cookie session after startup and clears it on sign out', async () => {
    apiMocks.restoreSession.mockResolvedValue({ email: 'owner@gmail.com', isAdmin: false })
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Restored dashboard' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
    expect(apiMocks.logout).toHaveBeenCalledOnce()
  })
})
