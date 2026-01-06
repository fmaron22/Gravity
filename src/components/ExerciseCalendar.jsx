import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react';
import Card from './Card';
import EvidenceModal from './EvidenceModal';
import { dataService } from '../services/dataService';

const ExerciseCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [logs, setLogs] = useState({}); // Stores logs keyed by date string
    const [selectedDate, setSelectedDate] = useState(null); // Triggers Modal

    const loadMonthData = async () => {
        // Basic implementation: fetch ample range. Optimize later for strict months.
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        // Simple query: get all logs for this month approximately
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = `${year}-${String(month).padStart(2, '0')}-31`;

        try {
            const data = await dataService.getMyLogs(start, end);
            const logsMap = {};
            data.forEach(log => {
                logsMap[log.date] = log;
            });
            setLogs(logsMap);
        } catch (error) {
            console.error("Failed to load logs", error);
        }
    };

    useEffect(() => {
        loadMonthData();
    }, [currentDate]);

    const handleDayClick = (dateKey) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const log = logs[dateKey];

        // If log exists, we can allow viewing it (implementation detail: EvidenceModal usually is for upload/edit)
        // If no log, only allow opening if it's TODAY.

        if (dateKey !== todayStr && !log) {
            alert("🚫 Strict Rules: You can only log workouts on the current day. Missed a day? Pay the penalty! 💸");
            return;
        }

        // Open modal to log or view details
        setSelectedDate(dateKey);
    };

    const onEvidenceSaved = () => {
        loadMonthData(); // Refresh data
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysCount = getDaysInMonth(currentDate);
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let day = 1; day <= daysCount; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logs[dateKey];
            const isCompleted = !!log;

            days.push(
                <button
                    key={dateKey}
                    className={`calendar-day ${isCompleted ? 'completed' : ''} ${!isCompleted ? 'disabled-day' : ''}`}
                    onClick={() => isCompleted && handleDayClick(dateKey)}
                    disabled={!isCompleted}
                    style={{ cursor: isCompleted ? 'pointer' : 'default' }}
                >
                    {day}
                    {isCompleted && (
                        <div className="check-mark"><Check size={12} strokeWidth={4} /></div>
                    )}
                </button>
            );
        }
        return days;
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <>
            <Card className="calendar-card">
                <div className="calendar-header">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
                        <ChevronLeft size={20} />
                    </button>
                    <h3>{monthName}</h3>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="calendar-grid-header">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>

                <div className="calendar-grid">
                    {generateCalendarDays()}
                </div>

                <style>{`
          .calendar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }
          .calendar-grid-header {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            text-align: center;
            color: var(--color-text-muted);
            font-size: 0.8rem;
            margin-bottom: 0.5rem;
          }
          .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 0.5rem;
          }
          .calendar-day {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
            color: var(--color-text-main);
            position: relative;
            background: transparent;
            transition: all 0.2s;
          }
          .calendar-day:hover:not(.empty) {
            background: var(--color-surface-hover);
          }
          .calendar-day .add-mark {
            opacity: 0;
            position: absolute;
            bottom: 2px;
            right: 2px;
            color: var(--color-text-muted);
          }
          .calendar-day:hover .add-mark {
            opacity: 1;
          }
          .calendar-day.completed {
            background: var(--color-primary);
            color: var(--color-bg);
            font-weight: bold;
            box-shadow: 0 0 10px var(--color-primary-glow);
          }
          .check-mark {
            position: absolute;
            bottom: 2px;
            right: 2px;
          }
        `}</style>
            </Card>

            {selectedDate && (
                <EvidenceModal
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                    onSave={onEvidenceSaved}
                />
            )}
        </>
    );
};

export default ExerciseCalendar;
