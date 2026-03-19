import { useState, useEffect } from 'react';

let isAltPressed = false;
const subscribers = new Set<(pressed: boolean) => void>();

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
        e.preventDefault();
        if (!isAltPressed) {
            isAltPressed = true;
            subscribers.forEach(cb => cb(true));
        }
    }
};

const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Alt') {
        e.preventDefault();
        if (isAltPressed) {
            isAltPressed = false;
            subscribers.forEach(cb => cb(false));
        }
    }
};

const handleBlur = () => {
    if (isAltPressed) {
        isAltPressed = false;
        subscribers.forEach(cb => cb(false));
    }
};

let listenersAttached = false;

export function useAltKey() {
    const [altPressed, setAltPressed] = useState(isAltPressed);

    useEffect(() => {
        if (!listenersAttached && typeof window !== 'undefined') {
            window.addEventListener('keydown', handleKeyDown);
            window.addEventListener('keyup', handleKeyUp);
            window.addEventListener('blur', handleBlur);
            listenersAttached = true;
        }

        setAltPressed(isAltPressed);
        subscribers.add(setAltPressed);
        return () => {
            subscribers.delete(setAltPressed);
        };
    }, []);

    return altPressed;
}
