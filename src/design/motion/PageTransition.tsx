/**
 * PageTransition — Transition de page fluide (AnimatePresence).
 *
 * Angles du design couverts :
 *  - Mouvement : entrée/sortie fluide entre les pages
 *  - Élévation : léger déplacement vertical
 *
 * Usage :
 *   <PageTransition>
 *     <ContenuDeLaPage />
 *   </PageTransition>
 */

import {
  motion,
  AnimatePresence,
  type MotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export function PageTransition({
  children,
  className,
}: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        className={cn(className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
