'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationApi, type Notification } from '@/app/(dashboard)/notifications/services/notification.api';

const typeLabels: Record<string, string> = {
  QC_INSPECTION_COMPLETED: 'QC Inspection Completed',
  QC_INSPECTION_FAILED: 'QC Inspection Failed',
  QC_RETEST_COMPLETED: 'QC Retest Completed',
  PRODUCTION_EXECUTION_COMPLETED: 'Production Execution Completed',
  SYSTEM_ALERT: 'System Alert',
  INFO: 'Information',
};

export default function NotificationButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [recentRes, countRes] = await Promise.all([
        notificationApi.getRecent(),
        notificationApi.getCount(),
      ]);
      setNotifications(recentRes.data);
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="relative h-10 w-10 rounded-full bg-white shadow flex items-center justify-center ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell
          className={`h-5 w-5 text-gray-700 ${unreadCount > 0 ? 'text-blue-600 animate-pulse' : ''}`}
        />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-600 text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white shadow-lg rounded-lg ring-1 ring-gray-200 z-50 animate-in fade-in slide-in-from-right-2 duration-200">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Notifications</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  window.location.href = '/notifications';
                }}
              >
                <ChevronRight className="h-3 w-3" />
                View All
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No recent notifications
              </div>
            ) : (
              notifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                    window.location.href = '/notifications';
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${n.isRead ? 'border-gray-200 text-gray-500' : 'border-blue-100 text-blue-600 bg-blue-50/50'}`}
                        >
                          {typeLabels[n.type] || n.type}
                        </span>
                        {!n.isRead && (
                          <span className="text-[9px] bg-blue-600 text-white px-1 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {n.title}
                      </div>
                      <div className="text-xs text-gray-600 truncate max-w-[240px]">
                        {n.message}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  notificationApi.markAllAsRead();
                  setUnreadCount(0);
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, isRead: true }))
                  );
                  setOpen(false);
                }}
              >
                Mark All as Read
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}