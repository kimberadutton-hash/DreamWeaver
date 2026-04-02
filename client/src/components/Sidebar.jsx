import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavTier } from '../hooks/useNavTier';

// ── Dot indicator ─────────────────────────────────────────────────────────────

function Dot({ active, locked }) {
  if (active) {
    return (
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#b8924a',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        border: `1px solid rgba(255,255,255,${locked ? '0.15' : '0.3'})`,
        background: 'transparent',
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

// ── Locked nav item with hover tooltip ────────────────────────────────────────

function LockedItem({ label, requirement }) {
  return (
    <div className="relative group/locked">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-body text-white/25 cursor-default select-none">
        <Dot locked />
        <span className="flex-1">{label}</span>
        <span style={{ fontSize: 9, opacity: 0.4 }}>locked</span>
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

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({ to, label, icon, muted }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-body transition-all duration-150 ${
          isActive
            ? 'bg-white/15 text-gold'
            : muted
              ? 'text-white/40 hover:text-white/70 hover:bg-white/8'
              : 'text-white/60 hover:text-white/90 hover:bg-white/8'
        }`
      }
    >
      {({ isActive }) =>
        icon ? (
          <>
            <span className="text-base opacity-80">{icon}</span>
            {label}
          </>
        ) : (
          <>
            <Dot active={isActive} />
            {label}
          </>
        )
      }
    </NavLink>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function NavSectionLabel({ children }) {
  return (
    <p
      className="px-4 font-display italic"
      style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 20, marginBottom: 6 }}
    >
      {children}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { hasGuide, unlocked, unlockRequirement } = useNavTier();
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

        {/* Record a Dream — standalone, always visible */}
        <div className="mb-1">
          <NavItem to="/new" label="Record a Dream" icon="✦" />
        </div>

        {/* THE THREAD */}
        <NavSectionLabel>The Thread</NavSectionLabel>
        <div className="space-y-0.5">
          <NavItem to="/archive" label="Dream Archive" />
        </div>

        {/* THE LOOM */}
        <NavSectionLabel>The Loom</NavSectionLabel>
        <div className="space-y-0.5">
          {unlocked.shadowWork
            ? <NavItem to="/shadow" label="Shadow Work" />
            : <LockedItem label="Shadow Work" requirement={unlockRequirement.shadowWork} />
          }
          {unlocked.activeImagination
            ? <NavItem to="/imagination" label="Active Imagination" />
            : <LockedItem label="Active Imagination" requirement={unlockRequirement.activeImagination} />
          }
          {unlocked.dailyPractice
            ? <NavItem to="/practice" label="Daily Practice" />
            : <LockedItem label="Daily Practice" requirement={unlockRequirement.dailyPractice} />
          }
        </div>

        {/* THE WEB */}
        <NavSectionLabel>The Web</NavSectionLabel>
        <div className="space-y-0.5">
          {unlocked.askArchive
            ? <NavItem to="/ask" label="Ask the Archive" />
            : <LockedItem label="Ask the Archive" requirement={unlockRequirement.askArchive} />
          }
          {unlocked.myJourney
            ? <NavItem to="/individuation" label="My Journey" />
            : <LockedItem label="My Journey" requirement={unlockRequirement.myJourney} />
          }
        </div>

        {/* THE WITNESS — guide users only */}
        {hasGuide && (
          <>
            <NavSectionLabel>The Witness</NavSectionLabel>
            <div className="space-y-0.5">
              <NavItem to="/focus" label="Analyst Focus" />
              <NavItem to="/letter" label="Session Letter" />
            </div>
          </>
        )}

        {/* Divider */}
        <div className="border-t border-white/10 my-4 mx-4" />

        {/* Bottom items — no section label, quieter style */}
        <div className="space-y-0.5">
          <NavItem to="/reference" label="Reference" muted />
          <NavItem to="/settings" label="Settings" muted />
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
