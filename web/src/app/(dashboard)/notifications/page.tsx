'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { notificationApi, type Notification } from './services/notification.api';

const typeColors: Record<string, string> = {
  QC_INSPECTION_COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
  QC_INSPECTION_FAILED: 'bg-red-100 text-red-700 border-red-200',
  QC_RETEST_COMPLETED: 'bg-amber-100 text-amber-700 border-amber-200',
  PRODUCTION_EXECUTION_COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  SYSTEM_ALERT: 'bg-purple-100 text-purple-700 border-purple-200',
  INFO: 'bg-gray-100 text-gray-700 border-gray-200',
};

const typeLabels: Record<string, string> = {
  QC_INSPECTION_COMPLETED: 'QC Inspection Completed',
  QC_INSPECTION_FAILED: 'QC Inspection Failed',
  QC_RETEST_COMPLETED: 'QC Retest Completed',
  PRODUCTION_EXECUTION_COMPLETED: 'Production Execution Completed',
  SYSTEM_ALERT: 'System Alert',
  INFO: 'Information',
};

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: async () =>
      unreadOnly
        ? (await notificationApi.getUnread()).data
        : (await notificationApi.getAll()).data,
  });

  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: async () => (await notificationApi.getCount()).data,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      toast({ title: 'Notification marked as read' });
    },
    onError: () => {
      toast({ title: 'Failed to mark as read', variant: 'destructive' });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
      toast({ title: 'All notifications marked as read' });
    },
    onError: () => {
      toast({ title: 'Failed to mark all as read', variant: 'destructive' });
    },
  });

  const handleMarkAsRead = useCallback(
    (id: number) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const unreadCount = countData?.count ?? 0;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            Manage your persistent notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Search notifications..."
            className="w-64"
          />
          <Button
            size="sm"
            variant={unreadOnly ? 'default' : 'outline'}
            onClick={() => setUnreadOnly(!unreadOnly)}
          >
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
        </div>
      </div>

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllAsRead}
                className="text-amber-600 hover:bg-amber-100"
              >
                Mark All as Read
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="border border-gray-200 bg-white p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">
              No notifications
            </h3>
            <p className="text-gray-500 mt-1">
              {unreadOnly
                ? 'No unread notifications.'
                : 'No notifications found.'}
            </p>
          </Card>
        ) : (
          notifications.map((notification: Notification) => (
            <Card
              key={notification.id}
              className={`border-l-4 p-4 ${
                notification.isRead
                  ? 'border-gray-200 bg-gray-50/50'
                  : 'border-blue-200 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${typeColors[notification.type] || typeColors.INFO}`}
                    >
                      {typeLabels[notification.type] || notification.type}
                    </span>
                    {!notification.isRead && (
                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600">
                    {notification.message}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-xs h-7 gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Read</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Mark as read"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            markAllAsReadMutation.mutate();
            window.location.reload();
          }}
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
}