import { useState, useEffect } from 'react';

interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
}

export function useCountdown(targetDate: string | Date | null): TimeRemaining | null {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

    useEffect(() => {
        if (!targetDate) {
            setTimeRemaining(null);
            return;
        }

        const calculateTimeRemaining = () => {
            const target = new Date(targetDate).getTime();
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    total: 0
                });
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                total: difference
            });
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return timeRemaining;
}

export function formatTimeRemaining(time: TimeRemaining | null): string {
    if (!time || time.total <= 0) return 'Ended';

    if (time.days > 0) {
        return `${time.days}d ${time.hours}h remaining`;
    }
    if (time.hours > 0) {
        return `${time.hours}h ${time.minutes}m remaining`;
    }
    if (time.minutes > 0) {
        return `${time.minutes}m ${time.seconds}s remaining`;
    }
    return `${time.seconds}s remaining`;
}
