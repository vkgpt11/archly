import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button>Sign in with Google</button>,
}))

describe('App', () => {
  it('presents Google-only sign in', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /build systems people understand/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByText(/@gmail.com accounts only/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue as local developer/i })).not.toBeInTheDocument()
  })
})
