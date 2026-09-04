"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    setLoading(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setLoading(false);
  }

  async function removeNotification(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => {
      const n = notifications.find((x) => x.id === id);
      return n && !n.isRead ? Math.max(0, c - 1) : c;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white min-h-11 min-w-11 inline-flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-signal text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-h-[400px] bg-steel border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <span className="text-sm font-medium text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  ({unreadCount} unread)
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-gold hover:text-gold/80 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Mark all read"
                )}
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[320px] scrollbar-thin scrollbar-thumb-white/10">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                    !n.isRead ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-signal shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[11px] text-gray-600 mt-1 block">
                        {new Date(n.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="p-1 text-gray-500 hover:text-green-400 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => removeNotification(n.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {n.actionUrl && (
                    <a
                      href={n.actionUrl}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                      className="text-xs text-gold hover:underline mt-1 inline-block"
                    >
                      View details →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
