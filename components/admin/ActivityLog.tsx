'use client';

import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Edit, FileText, Send, XCircle, Clock } from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
  userName?: string;
}

const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'created': return <FileText className="w-4 h-4 text-blue-400" />;
    case 'updated': return <Edit className="w-4 h-4 text-signal" />;
    case 'emailed':
    case 'sent': return <Send className="w-4 h-4 text-purple-400" />;
    case 'approved': return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
    default: return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

export function ActivityLog({ activities }: { activities: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-display font-semibold text-white mb-4">Recent Activity</h2>
        <div className="py-8 text-center text-sm text-gray-500">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="bg-steel/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <h2 className="text-xl font-display font-semibold text-white mb-6">Recent Activity</h2>
      
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
        {activities.map((activity, i) => (
          <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white/10 bg-surface shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
              {getActionIcon(activity.action)}
            </div>
            
            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-white/5 bg-surface/50 shadow">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white capitalize">{activity.action}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-gray-400">{activity.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
