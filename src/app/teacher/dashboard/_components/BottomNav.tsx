'use client';

import { useRouter } from 'next/navigation';

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const router = useRouter();
  const currentPath = typeof window !== 'undefined' ? '' : window.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-background-light dark:bg-slate-950 border-t border-slate-200 dark:border-primary-500/20 px-4 py-2 z-20 md:hidden">
 {/* Hide on desktop */}
 <div className="max-w-lg mx-auto flex justify-between items-center gap-2">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center gap-1 ${
            currentPath === item.href ? 'text-primary' : 'text-slate-400'
          }`}
          aria-current={currentPath === item.href ? 'page' : undefined}
        >
          <span className="material-symbols-outlined text-[24px]">
            {item.icon}
          </span>
          <span
            className={`text-[10px] ${
              currentPath === item.href ? 'font-bold' : 'font-medium'
            }`}
          >
            {item.label}
          </span>
        </a>
        ))}
      </div>
    </nav>
  );
}
