"use client";

import { motion } from "framer-motion";

export const DashboardSkeleton: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0.5 },
    visible: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#0B1120] p-6 space-y-8">
      {/* Header Skeleton */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
      >
        <div>
          <motion.div
            variants={itemVariants}
            className="h-10 w-48 bg-zinc-800 rounded-lg"
          />
          <motion.div
            variants={itemVariants}
            className="h-5 w-64 bg-zinc-800 rounded-lg mt-2"
          />
        </div>
        <motion.div
          variants={itemVariants}
          className="h-8 w-32 bg-zinc-800 rounded-lg"
        />
      </motion.div>

      {/* Cards Grid Skeleton */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="relative overflow-hidden rounded-2xl border border-zinc-700/50 p-6 bg-zinc-950/70"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
                <div className="h-8 w-40 bg-zinc-800 rounded" />
                <div className="h-3 w-48 bg-zinc-800 rounded mt-3" />
              </div>
              <div className="h-12 w-12 bg-zinc-800 rounded-lg" />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart Skeleton */}
      <motion.div
        variants={itemVariants}
        className="h-80 bg-zinc-950/70 backdrop-blur-md rounded-2xl border border-zinc-700/50 p-6"
      >
        <div className="h-8 w-40 bg-zinc-800 rounded mb-4" />
        <div className="h-64 flex items-end gap-2">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-zinc-800 rounded"
              style={{ height: `${Math.random() * 100 + 20}%` }}
            />
          ))}
        </div>
      </motion.div>

      {/* Footer Skeleton */}
      <motion.div
        variants={itemVariants}
        className="h-16 bg-zinc-950/70 backdrop-blur-md rounded-lg border border-zinc-700/50 p-4 flex items-center justify-between"
      >
        <div className="h-4 w-32 bg-zinc-800 rounded" />
        <div className="h-4 w-40 bg-zinc-800 rounded" />
      </motion.div>
    </div>
  );
};
