import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IonButton } from '@ionic/react';

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

interface Props {
  value: string;
  onChange: (date: string) => void;
  label: string;
  id?: string;
}

export default function DatePicker({ value, onChange, label, id }: Props) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-based start: Mon=0 … Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (day: number) => {
    const d = new Date(year, month, day);
    onChange(d.toISOString().split('T')[0]);
    setOpen(false);
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-text-tertiary text-xs mb-1.5 block">{label}</label>
      <IonButton
        expand="block"
        type="button"
        onClick={() => setOpen(!open)}
        id={id}
        className="w-full px-4 py-3 rounded-xl text-text-primary text-sm text-left flex items-center justify-between !min-height:auto"
        style={{ backgroundColor: '#212121', border: '1px solid #282828', color: 'inherit' }}
      >
        <span>{value ? new Date(value + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sélectionner…'}</span>
        <span className="text-text-tertiary text-xs">📅</span>
      </IonButton>

      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-2 rounded-2xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: '#181818', border: '1px solid #282828', minWidth: 280 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <IonButton onClick={prevMonth} className="!w-8 !h-8 !rounded-full !p-0 !min-height:auto" style={{ backgroundColor: '#282828' }}>
              <ChevronLeft className="w-4 h-4 text-text-primary" />
            </IonButton>
            <span className="text-text-primary font-semibold text-sm">
              {MONTHS_FR[month]} {year}
            </span>
            <IonButton onClick={nextMonth} className="!w-8 !h-8 !rounded-full !p-0 !min-height:auto" style={{ backgroundColor: '#282828' }}>
              <ChevronRight className="w-4 h-4 text-text-primary" />
            </IonButton>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 px-3 mb-1">
            {DAYS_FR.map(d => (
              <div key={d} className="text-center text-text-tertiary text-xs py-2 font-medium">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === value;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => selectDay(day)}
                  className="h-9 rounded-full text-sm font-medium transition-all flex items-center justify-center"
                  style={isSelected
                    ? { backgroundColor: '#FF6B00', color: '#fff' }
                    : isToday
                      ? { backgroundColor: '#282828', color: '#FF6B00' }
                      : { backgroundColor: 'transparent', color: '#FFFFFF' }
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
