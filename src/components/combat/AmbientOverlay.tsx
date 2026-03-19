import React, { useRef, useEffect } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
}

interface AmbientOverlayProps {
    width: number;
    height: number;
    type?: 'ash' | 'sparks' | 'mist';
}

export const AmbientOverlay: React.FC<AmbientOverlayProps> = ({ width, height, type = 'ash' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<Particle[]>([]);

    useEffect(() => {
        // Initialize particles
        const count = 40;
        const newParticles: Particle[] = [];
        for (let i = 0; i < count; i++) {
            newParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.5 + 0.1
            });
        }
        particles.current = newParticles;
    }, [width, height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            ctx.fillStyle = type === 'ash' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(251, 191, 36, 0.4)';

            particles.current.forEach(p => {
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Move particle
                p.y += p.speed;
                p.x += Math.sin(p.y / 50) * 0.2; // Slight drift

                // Reset position if out of bounds
                if (p.y > height) {
                    p.y = -10;
                    p.x = Math.random() * width;
                }
            });

            animationFrame = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrame);
    }, [width, height, type]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute inset-0 pointer-events-none z-[60] mix-blend-screen opacity-60"
        />
    );
};
