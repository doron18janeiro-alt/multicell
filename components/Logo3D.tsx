"use client";

import { motion } from "framer-motion";

interface Logo3DProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function Logo3D({ size = 200, className = "", animate = true }: Logo3DProps) {
  const MotionSVG = animate ? motion.svg : 'svg';
  const MotionG = animate ? motion.g : 'g';
  
  const animationProps = animate ? {
    animate: { 
      rotateY: [0, 5, 0, -5, 0],
      scale: [1, 1.02, 1, 1.02, 1]
    },
    transition: { 
      duration: 8, 
      repeat: Infinity, 
      ease: [0.4, 0, 0.2, 1] as any
    }
  } : {};

  return (
    <MotionSVG
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`drop-shadow-[0_0_20px_rgba(250,204,21,0.4)] ${className}`}
      style={{ 
        filter: 'drop-shadow(0 0 25px rgba(250, 204, 21, 0.6))',
        transformStyle: 'preserve-3d'
      }}
      {...animationProps}
    >
      {/* Definições de gradientes e filtros */}
      <defs>
        {/* Gradiente dourado principal */}
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF700" />
          <stop offset="25%" stopColor="#FACC15" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="75%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#DAA520" />
        </linearGradient>
        
        {/* Gradiente para sombra 3D */}
        <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B7355" />
          <stop offset="50%" stopColor="#6B5B47" />
          <stop offset="100%" stopColor="#4A3F35" />
        </linearGradient>
        
        {/* Gradiente para brilho */}
        <radialGradient id="glowGradient" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#FACC15" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#B8860B" stopOpacity="0.1" />
        </radialGradient>
        
        {/* Filtro de brilho */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Filtro de sombra interna */}
        <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feOffset dx="2" dy="2"/>
          <feGaussianBlur stdDeviation="2" result="offset-blur"/>
          <feFlood floodColor="#000000" floodOpacity="0.3"/>
          <feComposite in2="offset-blur" operator="in"/>
          <feMerge> 
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Sombra de base (efeito 3D) */}
      <MotionG
        transform="translate(6, 6)"
        opacity="0.3"
        {...(animate ? {
          animate: { opacity: [0.2, 0.4, 0.2] },
          transition: { duration: 4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] as any }
        } : {})}
      >
        {/* Círculo externo da sombra */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="url(#shadowGradient)"
          opacity="0.6"
        />
        
        {/* Hexágono da sombra */}
        <polygon
          points="100,35 135,55 135,85 100,105 65,85 65,55"
          fill="url(#shadowGradient)"
          opacity="0.8"
        />
      </MotionG>

      {/* Círculo externo principal */}
      <circle
        cx="100"
        cy="100"
        r="85"
        fill="url(#goldGradient)"
        stroke="#B8860B"
        strokeWidth="2"
        filter="url(#glow)"
      />
      
      {/* Círculo interno com brilho */}
      <circle
        cx="100"
        cy="100"
        r="75"
        fill="url(#glowGradient)"
        opacity="0.4"
      />

      {/* Hexágono central (representa tecnologia) */}
      <MotionG
        {...(animate ? {
          animate: { rotate: [0, 2, 0, -2, 0] },
          transition: { duration: 6, repeat: Infinity, ease: [0.4, 0, 0.2, 1] as any }
        } : {})}
      >
        <polygon
          points="100,35 135,55 135,85 100,105 65,85 65,55"
          fill="url(#goldGradient)"
          stroke="#DAA520"
          strokeWidth="3"
          filter="url(#innerShadow)"
        />
        
        {/* Brilho interno do hexágono */}
        <polygon
          points="100,40 130,57 130,83 100,100 70,83 70,57"
          fill="url(#glowGradient)"
          opacity="0.6"
        />
      </MotionG>

      {/* Texto WTM no centro */}
      <MotionG
        {...(animate ? {
          animate: { scale: [1, 1.05, 1] },
          transition: { duration: 4, repeat: Infinity, ease: [0.4, 0, 0.2, 1] as any }
        } : {})}
      >
        <text
          x="100"
          y="75"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fill="#0B1121"
          fontFamily="Arial, sans-serif"
          letterSpacing="2px"
        >
          WTM
        </text>
        
        {/* Brilho do texto */}
        <text
          x="100"
          y="75"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fill="url(#glowGradient)"
          fontFamily="Arial, sans-serif"
          letterSpacing="2px"
          opacity="0.7"
        />
      </MotionG>

      {/* Elementos decorativos (circuitos/tech) */}
      <MotionG
        opacity="0.6"
        {...(animate ? {
          animate: { opacity: [0.4, 0.8, 0.4] },
          transition: { duration: 3, repeat: Infinity, ease: [0.4, 0, 0.2, 1] as any }
        } : {})}
      >
        {/* Linhas de circuito */}
        <path
          d="M 60 60 L 80 60 L 80 40 M 120 60 L 140 60 L 140 40"
          stroke="#FACC15"
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M 60 140 L 80 140 L 80 160 M 120 140 L 140 140 L 140 160"
          stroke="#FACC15"
          strokeWidth="2"
          fill="none"
          opacity="0.8"
        />
        
        {/* Pontos de conexão */}
        <circle cx="60" cy="60" r="3" fill="#FACC15" opacity="0.9" />
        <circle cx="140" cy="60" r="3" fill="#FACC15" opacity="0.9" />
        <circle cx="60" cy="140" r="3" fill="#FACC15" opacity="0.9" />
        <circle cx="140" cy="140" r="3" fill="#FACC15" opacity="0.9" />
      </MotionG>

      {/* Anel externo decorativo */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="url(#goldGradient)"
        strokeWidth="1"
        opacity="0.5"
        strokeDasharray="5,5"
      />
      
      {/* Brilho final */}
      <MotionG
        {...(animate ? {
          animate: { opacity: [0.3, 0.7, 0.3] },
          transition: { duration: 2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] as any }
        } : {})}
      >
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          opacity="0.4"
        />
      </MotionG>
    </MotionSVG>
  );
}