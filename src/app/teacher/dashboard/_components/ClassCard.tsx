import React from 'react';

interface ClassCardProps {
  id: string;
  name: string;
  studentCount: number;
  progressPercent: number;
  gradientIndex: number;
  onManageClick?: () => void;
}

const gradients = [
  { from: 'from-purple', to: 'via-blue', bg: 'bg-gradient-to-r from-purple-600 to-blue-500' },
  { from: 'via-blue', to: 'to-teal', bg: 'bg-gradient-to-r from-blue-500 to-teal-500' },
  { from: 'to-teal', to: 'to-cyan', bg: 'bg-gradient-to-r from-teal-500 to-cyan-400' },
  { from: 'to-cyan', to: 'via-purple', bg: 'bg-gradient-to-r from-purple-600 to-cyan-400' },
];

export function ClassCard({
  id,
  name,
  studentCount,
  progressPercent,
  gradientIndex,
  onManageClick,
}: ClassCardProps) {
  const gradient = gradients[gradientIndex % gradients.length];
  const bgClass = gradient.bg;

  return (
    <div className="group bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-primary/10 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Gradient header */}
      <div className={`h-24 ${bgClass} px-6 flex flex-col justify-center relative overflow-hidden`}>
        <h4 className="text-lg font-bold text-white z-10">{name}</h4>
        <p className="text-sm text-white/80">{studentCount} Students</p>

        {/* Progress bar */}
        <div className="w-full bg-white/30 rounded-full h-1.5 mt-3">
          <div
            className="bg-white h-1.5 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Student avatars */}
          <div className="flex -space-x-2">
            {[1, 2, 3].map((_, idx) => (
              <div
                key={idx}
                className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-gradient-to-br from-primary to-blue-500"
              />
            ))}
            {studentCount > 3 && (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 -ml-2">
                +{studentCount - 3}
              </div>
            )}
          </div>

          {/* Manage button */}
          <button
            onClick={() => onManageClick?.()}
            className="px-4 py-2 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors font-semibold text-sm rounded-lg"
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
