import React from 'react';

export interface TooltipBoxProps {
  active?: boolean;
  payload?: { payload: any }[];
  render: (row: any) => React.ReactNode;
}

// Recharts injects active/payload when this element is passed as <Tooltip content={...} />.
export const TooltipBox: React.FC<TooltipBoxProps> = ({ active, payload, render }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="max-w-[220px] rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground shadow-md">
      {render(payload[0].payload)}
    </div>
  );
};