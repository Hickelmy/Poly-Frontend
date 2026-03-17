import React from 'react';
import { motion } from 'framer-motion';

export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="aspect-square bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-24" />
        </div>
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="aspect-video bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-16" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-16" />
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse w-full" />
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className = '' }: TextSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

export function KPISkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32" />
        </div>
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
}

export function ListSkeleton({ items = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SmallSpinnerProps {
  className?: string;
}

export function SmallSpinner({ className = '' }: SmallSpinnerProps) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
      className={`inline-block ${className}`}
    >
      <svg
        className="w-4 h-4 text-teal-600 dark:text-teal-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
}

interface InlineLoadingProps {
  message?: string;
}

export function InlineLoading({ message = 'Carregando...' }: InlineLoadingProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <SmallSpinner />
      <span className="text-sm text-slate-500 dark:text-slate-400">{message}</span>
    </div>
  );
}
