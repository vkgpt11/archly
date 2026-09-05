import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserMenu from './UserMenu'

describe('UserMenu', () => {
  afterEach(cleanup)

  it('shows Google identity, settings, admin navigation, and sign out', () => {
    const switchMode = vi.fn(); const signOut = vi.fn()
    render(<UserMenu token="token" user={{ email: 'vikasgupta.cs90@gmail.com', name: 'Vikas Gupta', picture: 'https://example.com/avatar.png', isAdmin: true }} onSwitchMode={switchMode} onSignOut={signOut} />)
    fireEvent.click(screen.getByRole('button', { name: 'Account menu for Vikas Gupta' }))
    expect(screen.getByText('vikasgupta.cs90@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Switch to admin dashboard' }))
    expect(switchMode).toHaveBeenCalledOnce()
  })

  it('falls back to initials and hides admin navigation for a normal user', () => {
    render(<UserMenu token="token" user={{ email: 'person@gmail.com', name: 'Person Example', isAdmin: false }} onSignOut={() => {}} />)
    expect(screen.getByText('PE')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Account menu for Person Example' }))
    expect(screen.queryByRole('menuitem', { name: /admin dashboard/i })).not.toBeInTheDocument()
  })
})
