'use client';

import { motion } from 'framer-motion';
import { FileText, Briefcase, Clock, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const iconMap: Record<string, any> = {
  FileText,
  Briefcase,
  Clock,
  DollarSign
};

interface Stat {
  label: string;
  value: string | number;
  icon: string;
  trend?: number;
  color: string;
}

export function DashboardStats({ stats }: { stats: Stat[] }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {stats.map((stat, i) => {
        const Icon = iconMap[stat.icon] || FileText;
        return (
          <motion.div 
            key={i} 
            variants={item}
            className="group relative bg-steel/40 hover:bg-steel/80 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all duration-300 overflow-hidden backdrop-blur-md"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.color} rounded-bl-full opacity-20 group-hover:opacity-40 transition-opacity blur-2xl pointer-events-none`} />
            
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-surface border border-white/5 ${stat.color.split(' ').pop()}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              {stat.trend !== undefined && (
                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full bg-surface border border-white/5 ${
                  stat.trend > 0 ? 'text-green-400' : stat.trend < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {stat.trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : 
                   stat.trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : 
                   <Minus className="w-3 h-3 mr-1" />}
                  {Math.abs(stat.trend)}%
                </div>
              )}
            </div>
            
            <div>
              <div className="text-gray-400 text-sm font-medium mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-white font-oswald tracking-wide">{stat.value}</div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
