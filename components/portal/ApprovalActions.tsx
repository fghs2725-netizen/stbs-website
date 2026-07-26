'use client';

import { useState } from 'react';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApprovalActionsProps {
  documentId: string;
  currentStatus: string;
  onAction: (action: string, comment: string) => void;
}

export default function ApprovalActions({ documentId, currentStatus, onAction }: ApprovalActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActionClick = (action: 'approve' | 'reject' | 'changes') => {
    setActiveAction(action);
    setIsOpen(true);
  };

  const submitAction = async () => {
    if (!activeAction) return;
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 800));
    
    onAction(activeAction, comment);
    setIsSubmitting(false);
    setIsOpen(false);
    setActiveAction(null);
    setComment('');
  };

  if (currentStatus !== 'Pending Approval') {
    return (
      <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium border border-gray-200">
        Status: {currentStatus}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => handleActionClick('reject')}
          className="inline-flex items-center justify-center px-4 py-2 border border-red-200 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          <X className="w-4 h-4 mr-1.5" />
          Reject
        </button>
        <button
          onClick={() => handleActionClick('changes')}
          className="inline-flex items-center justify-center px-4 py-2 border border-yellow-200 text-sm font-medium rounded-lg text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
        >
          <MessageSquare className="w-4 h-4 mr-1.5" />
          Request Changes
        </button>
        <button
          onClick={() => handleActionClick('approve')}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-sm"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Approve Document
        </button>
      </div>

      <AnimatePresence>
        {isOpen && activeAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className={`px-6 py-4 border-b ${
                activeAction === 'approve' ? 'bg-green-50 border-green-100' :
                activeAction === 'reject' ? 'bg-red-50 border-red-100' :
                'bg-yellow-50 border-yellow-100'
              }`}>
                <h3 className={`text-lg font-bold ${
                  activeAction === 'approve' ? 'text-green-800' :
                  activeAction === 'reject' ? 'text-red-800' :
                  'text-yellow-800'
                }`}>
                  {activeAction === 'approve' ? 'Confirm Approval' :
                   activeAction === 'reject' ? 'Reject Document' :
                   'Request Changes'}
                </h3>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a comment {activeAction === 'approve' ? '(Optional)' : '(Required)'}
                </label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 text-sm"
                  placeholder="Enter your feedback here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={isSubmitting || (activeAction !== 'approve' && comment.trim() === '')}
                  className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white disabled:opacity-50 transition-colors shadow-sm ${
                    activeAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    activeAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
