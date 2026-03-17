import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface FullScreenLoadingProps {
  isLoading: boolean;
  message?: string;
}

export default function FullScreenLoading({ isLoading, message }: FullScreenLoadingProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear"
          }}
          className="relative"
        >
          <Loader2 className="w-12 h-12 text-teal-600 dark:text-teal-400" />
        </motion.div>

        {message && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
