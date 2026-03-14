'use client';

import { usePathname } from 'next/navigation';

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-background-light dark:bg-slate-950 border-t border-slate-200 dark:border-primary/20 px-4 py-2 z-20 md:hidden">
      <div className="max-w-lg mx-auto flex justify-between items-center gap-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 ${
                isActive ? 'text-primary' : 'text-slate-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="material-symbols-outlined text-[24px]">
                {item.icon}
              </span>
              <span
                className={`text-[10px] ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
