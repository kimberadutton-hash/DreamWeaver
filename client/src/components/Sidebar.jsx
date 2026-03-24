import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/archive', label: 'Archive', icon: '◎' },
  { to: '/new', label: 'New Dream', icon: '✦' },
  { to: '/symbols', label: 'Symbols & Archetypes', icon: '◈' },
  { to: '/focus', label: 'Analyst Focus', icon: '◇' },
  { to: '/timeline', label: 'Timeline', icon: '◌' },
  { to: '/ask', label: 'Ask Your Archive', icon: '◉' },
  { to: '/individuation', label: 'Individuation', icon: '⌾' },
  { to: '/import', label: 'Import CSV', icon: '⊕' },
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
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, label, icon }) => (
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
