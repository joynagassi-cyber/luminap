/**
 * PageTransition — Transition de page fluide (Framer Motion).
 *
 * Angle du design : mouvement entre les vues, éviter le "snap" brutal.
 *
 * Usage :
 *   <PageTransition>
 *     <MonContenuDePage />
 *   </PageTransition>
 */

import {
  motion,
  AnimatePresence,
  type Transition,
} from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  transition?: Transition;
}

export function PageTransition({
  children,
  className,
  transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
}: PageTransitionProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
