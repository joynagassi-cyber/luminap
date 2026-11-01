/**
 * MotionList — Liste avec animations d'entrée staggered (Framer Motion).
 *
 * Angles du design couverts :
 *  - Mouvement : apparition en cascade (stagger) des éléments
 *  - Espacement : gaps cohérents entre les items
 *  - Interaction : chaque item réagit au hover
 *
 * Usage :
 *   <MotionList items={items} renderItem={(item) => <div>{item.label}</div>} />
 */

import {
  motion,
  AnimatePresence,
  type MotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  variant?: "fade" | "slide" | "scale";
  staggerChildren?: number;
}

const VARIANTS: Record<string, any> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function MotionList<T>({
  items,
  renderItem,
  className,
  itemClassName,
  variant = "slide",
  staggerChildren = 0.06,
}: MotionListProps<T>) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = VARIANTS[variant];

  return (
    <motion.ul
      className={cn("divide-y divide-border", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="wait">
        {items.map((item, index) => (
          <motion.li
            key={String(index)}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
            className={cn(
              "px-4 py-3 text-text-primary transition-colors",
              itemClassName,
            )}
          >
            {renderItem(item, index)}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

export default MotionList;
