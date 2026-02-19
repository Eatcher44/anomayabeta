import React from 'react';

const PRESET_COLORS = [
  '#FF6B6B', '#FF8E72', '#FFC078', '#FFE066',
  '#A9E34B', '#69DB7C', '#38D9A9', '#3BC9DB',
  '#4DABF7', '#748FFC', '#9775FA', '#DA77F2',
  '#F783AC', '#868E96',
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* No color option */}
      <button
        onClick={() => onChange(null)}
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform ${
          !value ? 'border-primary scale-110' : 'border-border'
        }`}
      >
        <span className="text-xs text-muted-foreground">∅</span>
      </button>
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`w-8 h-8 rounded-full border-2 transition-transform ${
            value === color ? 'border-primary scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
