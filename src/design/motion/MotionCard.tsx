/**
 * MotionCard — Carte avec micro-interactions (Framer Motion).
 *
 * Angles du design couverts :
 *  - Mouvement : entrée fluide, hover scale, tap press
 *  - Élévation : shadow-card/pop selon l'état
 *  - Bordure : radius cohérent avec les tokens
 *  - Interaction : hitzone tactile, focus visible
 *
 * Usage :
 *   <MotionCard variant="elevated" onPress={...}>
 *     <Contenu />
 *   </MotionCard>
 */

import {
  motion,
  type MotionProps,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionCardProps
  extends Omit<HTMLMotionProps<"div">, "className"> {
  children: React.ReactNode;
  variant?: "flat" | "elevated" | "accent";
  onPress?: () => void;
  className?: string;
}

export function MotionCard({
  children,
  variant = "flat",
  onPress,
  className,
  ...props
}: MotionCardProps) {
  // Variantes d'entrée et de hover
  const variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    },
    hover: {
      y: variant === "elevated" ? -4 : -2,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    },
    tap: { scale: 0.98 },
  };

  // Classes de style selon la variante
  const baseStyles: Record<string, string> = {
    flat: "bg-surface border border-border rounded-xl p-4",
    elevated: "bg-surface border border-border rounded-xl p-4 shadow-card",
    accent: "bg-surface border border-border rounded-xl p-4 shadow-accent-sm",
  };

  return (
    <motion.div
      className={cn(baseStyles[variant], className)}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      variants={variants}
      onClick={onPress}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default MotionCard;
