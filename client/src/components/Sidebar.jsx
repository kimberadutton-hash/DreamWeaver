import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_GROUPS = [
  {
    label: 'The Inner Work',
    items: [
      { to: '/new',     label: 'Record a Dream',     icon: '✦' },
      { to: '/archive', label: 'Dream Archive',       icon: '◎' },
    ],
  },
  {
    label: 'The Journey',
    items: [
      { to: '/individuation', label: 'My Journey',           icon: '⌾' },
      { to: '/symbols',       label: 'Symbols & Archetypes', icon: '◈' },
      { to: '/timeline',      label: 'Timeline',             icon: '◌' },
    ],
  },
  {
    label: 'The Relationship',
    items: [
      { to: '/focus',     label: 'Analyst Focus',   icon: '◇' },
      { to: '/letter',    label: 'Session Letter',  icon: '◎' },
      { to: '/ask',       label: 'Ask the Archive', icon: '◉' },
      { to: '/reference', label: 'Reference',       icon: '◉' },
    ],
  },
];

const BOTTOM_ITEMS = [
  { to: '/import',   label: 'Import',   icon: '⊕' },
  { to: '/settings', label: 'Settings', icon: '◦' },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
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

        {/* Grouped sections */}
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label} className="mb-1">
            <p
              className="px-4 font-body uppercase text-white/30"
              style={{ fontSize: 9, letterSpacing: '0.18em', marginTop: 20, marginBottom: 6 }}
            >
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, label: itemLabel, icon }) => (
                <NavLink
                  key={to}
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
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-white/10 my-4 mx-4" />

        {/* Bottom items */}
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
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
          ))}
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
