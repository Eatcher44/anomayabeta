import React from 'react';

interface StatusBadgeProps {
  status: 'green' | 'orange' | 'red';
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = {
    green: 'bg-status-green',
    orange: 'bg-status-orange',
    red: 'bg-status-red',
  }[status];

  return (
    <div className={`w-3 h-3 rounded-full ${colorClass} ${className}`} />
  );
}
