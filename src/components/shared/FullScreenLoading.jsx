import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function FullScreenLoading({ isLoading, message }) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* Backdrop com blur */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />
      
      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Spinner animado */}
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
        
        {/* Mensagem opcional */}
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

