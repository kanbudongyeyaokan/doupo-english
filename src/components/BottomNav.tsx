import { BookMarked, Flame, Home, Library, UserRound } from 'lucide-react'

export type AppRoute = 'home' | 'review' | 'library' | 'mistakes' | 'profile'

const items: Array<{ route: AppRoute; label: string; icon: typeof Home }> = [
  { route: 'home', label: '首页', icon: Home },
  { route: 'review', label: '修炼', icon: Flame },
  { route: 'library', label: '词库', icon: Library },
  { route: 'mistakes', label: '错词', icon: BookMarked },
  { route: 'profile', label: '我的', icon: UserRound }
]

export function BottomNav({ current, onNavigate }: { current: AppRoute; onNavigate: (route: AppRoute) => void }) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map(({ route, label, icon: Icon }) => (
        <button
          key={route}
          type="button"
          className={current === route ? 'nav-item active' : 'nav-item'}
          aria-current={current === route ? 'page' : undefined}
          onClick={() => onNavigate(route)}
        >
          <Icon size={21} strokeWidth={current === route ? 2.4 : 1.9} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

