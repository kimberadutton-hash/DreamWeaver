import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavTier } from '../hooks/useNavTier';

// ── Locked nav item with hover tooltip ────────────────────────────────────────

function LockedItem({ label, icon, requirement }) {
  return (
    <div className="relative group/locked">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-body text-white/60 opacity-35 cursor-default select-none">
        <span className="text-base opacity-80">{icon}</span>
        {label}
      </div>
      <div
        className="absolute left-4 bottom-full mb-1.5 z-50 pointer-events-none opacity-0 group-hover/locked:opacity-100 transition-opacity duration-150"
        style={{ minWidth: 180 }}
      >
        <div
          className="px-2.5 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'rgba(61,43,74,0.97)',
            border: '1px solid rgba(184,146,74,0.2)',
          }}
        >
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: 'rgba(184,146,74,0.65)',
              fontStyle: 'italic',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            Unlocks with {requirement}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Nav item (active link) ────────────────────────────────────────────────────

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-body transition-all duration-150 ${
          isActive
            ? 'bg-white/15 text-gold'
            : 'text-white/60 hover:text-white/90 hover:bg-white/8'
        }`
      }
    >
      <span className="text-base opacity-80">{icon}</span>
      {label}
    </NavLink>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function NavSectionLabel({ children }) {
  return (
    <p
      className="px-4 font-body uppercase text-white/30"
      style={{ fontSize: 9, letterSpacing: '0.18em', marginTop: 20, marginBottom: 6 }}
    >
      {children}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { unlocked, visibleLocked, unlockRequirement } = useNavTier();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <aside
      className="w-[280px] shrink-0 flex flex-col h-full"
      style={{ backgroundColor: '#3d2b4a' }}
    >
      {/* Header */}
      <div className="px-7 pt-8 pb-6 border-b border-white/10">
        <h1 className="font-display italic text-3xl text-gold tracking-wide">
          Dream Weaver
        </h1>
        {profile?.display_name && (
          <p className="text-white/50 text-sm mt-1 font-body">
            {profile.display_name}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-thin">

        {/* Record a Dream — always visible, always unlocked */}
        <div className="mb-1">
          <NavItem to="/new" label="Record a Dream" icon="✦" />
        </div>

        {/* THE EMBODIMENT */}
        <NavSectionLabel>The Embodiment</NavSectionLabel>
        <div className="space-y-0.5">
          <NavItem to="/practice" label="Daily Practice" icon="◎" />
          {unlocked.wakingLife
            ? <NavItem to="/waking-life" label="Waking Life" icon="◉" />
            : visibleLocked.wakingLife && (
                <LockedItem label="Waking Life" icon="◉" requirement={unlockRequirement.wakingLife} />
              )
          }
        </div>

        {/* THE INNER WORK */}
        <NavSectionLabel>The Inner Work</NavSectionLabel>
        <div className="space-y-0.5">
          {unlocked.dreamArchive
            ? <NavItem to="/archive" label="Dream Archive" icon="◎" />
            : visibleLocked.dreamArchive && (
                <LockedItem label="Dream Archive" icon="◎" requirement={unlockRequirement.dreamArchive} />
              )
          }
          {unlocked.activeImagination
            ? <NavItem to="/imagination" label="Active Imagination" icon="◎" />
            : visibleLocked.activeImagination && (
                <LockedItem label="Active Imagination" icon="◎" requirement={unlockRequirement.activeImagination} />
              )
          }
          {unlocked.shadowWork
            ? <NavItem to="/shadow" label="Shadow Work" icon="◈" />
            : visibleLocked.shadowWork && (
                <LockedItem label="Shadow Work" icon="◈" requirement={unlockRequirement.shadowWork} />
              )
          }
        </div>

        {/* THE JOURNEY */}
        <NavSectionLabel>The Journey</NavSectionLabel>
        <div className="space-y-0.5">
          {unlocked.myJourney
            ? <NavItem to="/individuation" label="My Journey" icon="⌾" />
            : visibleLocked.myJourney && (
                <LockedItem label="My Journey" icon="⌾" requirement={unlockRequirement.myJourney} />
              )
          }
          {unlocked.dreamSeries
            ? <NavItem to="/series" label="Dream Series" icon="◎" />
            : visibleLocked.dreamSeries && (
                <LockedItem label="Dream Series" icon="◎" requirement={unlockRequirement.dreamSeries} />
              )
          }
          {unlocked.timeline
            ? <NavItem to="/timeline" label="Timeline" icon="◌" />
            : visibleLocked.timeline && (
                <LockedItem label="Timeline" icon="◌" requirement={unlockRequirement.timeline} />
              )
          }
        </div>

        {/* THE RELATIONSHIP */}
        <NavSectionLabel>The Relationship</NavSectionLabel>
        <div className="space-y-0.5">
          {unlocked.analystFocus
            ? <NavItem to="/focus" label="Analyst Focus" icon="◇" />
            : visibleLocked.analystFocus && (
                <LockedItem label="Analyst Focus" icon="◇" requirement={unlockRequirement.analystFocus} />
              )
          }
          {unlocked.sessionLetter
            ? <NavItem to="/letter" label="Session Letter" icon="◎" />
            : visibleLocked.sessionLetter && (
                <LockedItem label="Session Letter" icon="◎" requirement={unlockRequirement.sessionLetter} />
              )
          }
          {unlocked.askArchive
            ? <NavItem to="/ask" label="Ask the Archive" icon="◉" />
            : <LockedItem label="Ask the Archive" icon="◉" requirement={unlockRequirement.askArchive} />
          }
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-4 mx-4" />

        {/* Bottom items */}
        <div className="space-y-0.5">
          <NavItem to="/reference" label="Reference" icon="◉" />
          {unlocked.import && <NavItem to="/import" label="Import" icon="⊕" />}
          <NavItem to="/settings" label="Settings" icon="◦" />
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="text-white/40 text-xs hover:text-white/70 transition-colors font-body"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
