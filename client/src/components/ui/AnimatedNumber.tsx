import { useState, useEffect, useRef, memo } from 'react';

interface ScrollNumberProps {
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    duration?: number;
}

const DIGITS = '0123456789';

/**
 * Single digit slot machine component
 */
const SlotDigit = memo(function SlotDigit({
    digit,
    duration = 500
}: {
    digit: string;
    duration?: number;
}) {
    const columnRef = useRef<HTMLDivElement>(null);

    // Handle non-numeric characters
    if (!DIGITS.includes(digit)) {
        return (
            <span
                className="inline-block text-center"
                style={{ width: digit === '.' ? '0.35em' : '0.6em' }}
            >
                {digit}
            </span>
        );
    }

    const digitIndex = parseInt(digit, 10);

    return (
        <span
            className="inline-block overflow-hidden"
            style={{
                height: '1.15em',
                width: '0.6em',
                lineHeight: '1.15em',
            }}
        >
            <div
                ref={columnRef}
                className="flex flex-col"
                style={{
                    transform: `translateY(-${digitIndex * 1.15}em)`,
                    transition: `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`,
                }}
            >
                {DIGITS.split('').map((d) => (
                    <span
                        key={d}
                        className="block text-center"
                        style={{
                            height: '1.15em',
                            lineHeight: '1.15em',
                        }}
                    >
                        {d}
                    </span>
                ))}
            </div>
        </span>
    );
});

/**
 * Slot machine style scrolling number
 * Each digit scrolls independently like a slot machine
 */
export function ScrollNumber({
    value,
    decimals = 2,
    prefix = '',
    suffix = '',
    className = '',
    duration = 500
}: ScrollNumberProps) {
    const formattedValue = value.toFixed(decimals);
    const characters = formattedValue.split('');

    return (
        <span className={`inline-flex items-baseline ${className}`}>
            {prefix}
            {characters.map((char, index) => (
                <SlotDigit
                    key={`${index}-${characters.length}`}
                    digit={char}
                    duration={duration + index * 50} // Stagger animation
                />
            ))}
            {suffix}
        </span>
    );
}

/**
 * CountUp style - number gradually changes
 */
export function CountUp({
    value,
    decimals = 2,
    prefix = '',
    suffix = '',
    className = '',
    duration = 500
}: ScrollNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const animationRef = useRef<number>();
    const startTimeRef = useRef<number>(0);
    const startValueRef = useRef(value);
    const targetValueRef = useRef(value);

    useEffect(() => {
        if (targetValueRef.current === value) return;

        const startValue = displayValue;
        const endValue = value;
        const diff = endValue - startValue;

        startTimeRef.current = Date.now();
        targetValueRef.current = value;

        const animate = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + diff * easeProgress;

            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration, displayValue]);

    return (
        <span className={className}>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
    );
}

/**
 * Flash highlight effect
 */
export function FlashNumber({
    value,
    decimals = 2,
    prefix = '',
    suffix = '',
    className = ''
}: ScrollNumberProps) {
    const [isFlashing, setIsFlashing] = useState(false);
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (prevValueRef.current !== value) {
            setIsFlashing(true);
            const timer = setTimeout(() => setIsFlashing(false), 300);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    return (
        <span className={`inline-block transition-all duration-150 ${className} ${isFlashing ? 'brightness-150 scale-105' : ''}`}>
            {prefix}{value.toFixed(decimals)}{suffix}
        </span>
    );
}

export const AnimatedNumber = ScrollNumber;
