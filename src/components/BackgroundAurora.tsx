import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedY: number;
  opacity: number;
}

export default function BackgroundAurora() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate subtle cinematic dust particles to give the background dimension
    const generated: Particle[] = Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.05 + 0.02,
      opacity: Math.random() * 0.4 + 0.1,
    }));
    setParticles(generated);

    // Animate the dust particles floating upwards
    let animationFrameId: number;
    const updateParticles = () => {
      setParticles((prev) =>
        prev.map((p) => {
          let newY = p.y - p.speedY;
          if (newY < -5) {
            newY = 105; // Reset to bottom when floating off screen
          }
          return { ...p, y: newY };
        })
      );
      animationFrameId = requestAnimationFrame(updateParticles);
    };

    animationFrameId = requestAnimationFrame(updateParticles);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed inset-0 -z-50 bg-[#09090f] overflow-hidden pointer-events-none select-none">
      {/* Aurora Lighting Spot 1 - Radical Red */}
      <div 
        className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px] animate-aurora-slow"
        style={{ transformOrigin: "center center" }}
      />

      {/* Aurora Lighting Spot 2 - Velvet Deep Blue Glow */}
      <div 
        className="absolute top-[40%] -right-[15%] w-[60%] h-[60%] rounded-full bg-blue-600/8 blur-[150px] animate-aurora-slower"
        style={{ transformOrigin: "center center" }}
      />

      {/* Aurora Lighting Spot 3 - Subtle Red Highlight */}
      <div 
        className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full bg-red-900/5 blur-[120px]"
      />

      {/* Modern Grid Texture Overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.0125]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Ambient Floating Dust Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bg-white rounded-full transition-transform duration-75"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            boxShadow: p.size > 2 ? "0 0 8px rgba(255, 255, 255, 0.4)" : "none",
          }}
        />
      ))}
    </div>
  );
}
