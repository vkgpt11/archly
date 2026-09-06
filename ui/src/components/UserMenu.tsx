import { useEffect, useRef, useState } from 'react'
import type { AuthSession } from '../api'
import { LayoutDashboard, LogOut, Settings } from 'lucide-react'

type Props = { token?: string; user: AuthSession; adminMode?: boolean; onSwitchMode?: () => void; onOpenSettings?: () => void; onSignOut: () => void }

export default function UserMenu({ user, adminMode = false, onSwitchMode, onOpenSettings = () => {}, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const displayName = user.name?.trim() || user.email.split('@')[0]
  const initials = displayName.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [])
  return <div className="user-menu" ref={root}>
    <button className="user-menu-trigger" aria-label={`Account menu for ${displayName}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}>{user.picture && !imageFailed ? <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <span aria-hidden="true">{initials}</span>}</button>
    {open && <div className="user-menu-popover" role="menu">
      <div className="user-menu-identity"><strong>{displayName}</strong><span>{user.email}</span>{user.isAdmin && <small>Administrator</small>}</div>
      <button role="menuitem" className="icon-text-button" onClick={() => { setOpen(false); onOpenSettings() }}><Settings />Settings</button>
      {user.isAdmin && onSwitchMode && <button role="menuitem" className="icon-text-button" onClick={() => { setOpen(false); onSwitchMode() }}><LayoutDashboard />{adminMode ? 'Switch to projects' : 'Switch to admin dashboard'}</button>}
      <button role="menuitem" className="user-menu-signout icon-text-button" onClick={onSignOut}><LogOut />Sign out</button>
    </div>}
  </div>
}
