import { useState, Fragment, forwardRef, useEffect } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/16/solid';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  onFocus?: () => void;
  onCalendarOpenChange?: (isOpen: boolean) => void;
  autoOpen?: boolean;
  clearButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onClear?: () => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(
  function DatePicker({ value, onChange, label, onFocus, onCalendarOpenChange, autoOpen, clearButtonRef, onClear }, ref) {
  const today = new Date();
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [isOpen, setIsOpen] = useState(autoOpen ?? false);
  
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(selectedDate);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Notify parent when calendar open state changes
  useEffect(() => {
    onCalendarOpenChange?.(isOpen);
  }, [isOpen, onCalendarOpenChange]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get days in month and starting day
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    // Format as YYYY-MM-DD in local timezone (avoid toISOString which converts to UTC)
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const isPast = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(23, 59, 59, 999);
    return date < today;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div>
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2">
          <button 
            ref={ref}
            type="button"
            aria-label={value ? `Selected date: ${formatDisplayDate(value)}. Click to change` : 'Select a date'}
            onFocus={onFocus}
            onClick={() => setIsOpen(true)}
            className="flex-1 pl-10 pr-4 py-2.5 rounded-xl bg-bg-tertiary border border-border text-left text-sm focus:outline-none focus:border-accent transition-colors relative"
          >
            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
            <span className={value ? 'text-text-primary' : 'text-text-muted'}>
              {value ? formatDisplayDate(value) : 'Select a date'}
            </span>
          </button>
          {value && (
            <button
              ref={clearButtonRef}
              type="button"
              aria-label="Clear date"
              onClick={() => {
                onChange('');
                onClear?.();
              }}
              className="px-3 py-2.5 rounded-xl bg-bg-tertiary hover:bg-bg-hover border border-border text-text-muted hover:text-text-primary text-sm transition-colors focus:outline-none focus:border-accent"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => setIsOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-6">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-72 rounded-xl bg-bg-secondary border border-border shadow-xl p-4">
                  {/* Close button row */}
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      aria-label="Close calendar"
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                      title="Close (Esc)"
                    >
                      <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-[10px] hidden sm:inline">Esc</span>
                    </button>
                  </div>

                  {/* Header with month/year navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handlePrevMonth}
                      aria-label="Previous month"
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="text-sm font-medium text-text-primary">
                      {MONTHS[month]} {year}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      aria-label="Next month"
                      className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                    >
                      <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="text-xs font-medium text-text-muted text-center py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
                    {calendarDays.map((day, index) => (
                      <div key={index} className="aspect-square" role="gridcell">
                        {day !== null ? (
                          <button
                            onClick={() => handleSelectDate(day)}
                            aria-label={`${MONTHS[month]} ${day}, ${year}${isToday(day) ? ' (Today)' : ''}${isSelected(day) ? ' (Selected)' : ''}`}
                            aria-pressed={isSelected(day)}
                            className={`w-full h-full rounded-lg text-sm font-medium transition-colors ${
                              isSelected(day)
                                ? 'bg-accent text-white'
                                : isToday(day)
                                ? 'bg-accent/20 text-accent hover:bg-accent/30'
                                : isPast(day)
                                ? 'text-text-muted hover:bg-bg-tertiary'
                                : 'text-text-primary hover:bg-bg-tertiary'
                            }`}
                          >
                            {day}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Footer with quick actions */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => {
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        onChange(todayStr);
                        setIsOpen(false);
                      }}
                      aria-label="Select today's date"
                      className="text-xs text-accent hover:text-accent-hover transition-colors"
                    >
                      Today
                    </button>
                    {value && (
                      <button
                        onClick={handleClear}
                        aria-label="Clear selected date"
                        className="text-xs text-text-muted hover:text-danger transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
});
