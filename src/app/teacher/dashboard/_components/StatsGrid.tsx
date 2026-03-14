import React from 'react';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
}

export function StatsGrid({ stats }: { stats: StatCardProps[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-primary/10 transition-all hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl text-primary">{stat.icon}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2">{stat.label}</p>
          <p className="text-2xl font-bold text-primary">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
