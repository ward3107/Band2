import React from 'react';

interface ActivityItem {
  icon: string;
  title: string;
  description: string;
  time: string;
  color?: 'blue' | 'purple' | 'green';
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

function getActivityColor(color?: 'blue' | 'purple' | 'green'): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-600',
  };
  return color ? (colorMap[color] || 'bg-slate-100 dark:bg-slate-700 text-slate-600') : 'bg-slate-100 dark:bg-slate-700 text-slate-600';
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <section className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-primary/10">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-primary/10">
        <h3 className="text-xl font-bold">Recent Activity</h3>
        <button className="text-primary font-semibold text-sm hover:underline">
          View All
        </button>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-primary/10">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <div className={`size-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.color)}`}>
              <span className="material-symbols-outlined text-xl">
                {activity.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">
                {activity.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {activity.description}
              </p>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </div>
        ))}
      </div>
    </section>
  );
}
