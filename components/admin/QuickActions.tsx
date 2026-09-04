'use client';

import Link from 'next/link';
import { FileText, Briefcase, FileSignature, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

const actions = [
  { name: 'New Quotation', type: 'QUOTATION', icon: Briefcase, color: 'text-signal', bg: 'bg-signal/10 group-hover:bg-signal/20' },
  { name: 'New Invoice', type: 'INVOICE', icon: Receipt, color: 'text-blue-400', bg: 'bg-blue-500/10 group-hover:bg-blue-500/20' },
  { name: 'New Proposal', type: 'PROPOSAL', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10 group-hover:bg-purple-500/20' },
  { name: 'New Contract', type: 'CONTRACT', icon: FileSignature, color: 'text-green-400', bg: 'bg-green-500/10 group-hover:bg-green-500/20' },
];

export function QuickActions() {
  return (
    <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h2 className="text-xl font-display font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <Link key={i} href={`/admin/documents/new?type=${action.type}`}>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group p-4 rounded-xl border border-white/5 bg-surface/50 hover:bg-surface transition-all flex flex-col items-center text-center gap-3"
            >
              <div className={`p-3 rounded-xl transition-colors ${action.bg}`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-300 group-hover:text-white">{action.name}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
