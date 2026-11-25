'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCircle2, RefreshCw, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { notificationApi, type Notification, type NotificationFilters, type NotificationResponse } from './services/notification.api';

// Dynamic color generator - creates consistent colors from any string
function generateColorFromString(str: string): { bg: string; text: string; border: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const saturation = 65;
  const lightnessBg = 88;
  const lightnessText = 35;
  const lightnessBorder = 75;
  
  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightnessBg}%)`,
    text: `hsl(${hue}, ${saturation}%, ${lightnessText}%)`,
    border: `hsl(${hue}, ${saturation}%, ${lightnessBorder}%)`,
  };
}

// Format type string to readable label
function formatTypeLabel(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Format severity label
function formatSeverityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
}

// Get severity color (fixed mapping for severity since there are only a few)
function getSeverityColors(severity: string): { bg: string; text: string; border: string } {
  const severityMap: Record<string, { bg: string; text: string; border: string }> = {
    INFO: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    WARNING: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    ERROR: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    CRITICAL: { bg: 'bg-red-200', text: 'text-red-900', border: 'border-red-300' },
  };
  return severityMap[severity.toUpperCase()] || severityMap.INFO;
}

export default function NotificationsPage() {
  const [filters, setFilters] = useState<NotificationFilters>({
    isRead: undefined,
    type: '',
    module: '',
    severity: '',
    search: '',
    fromDate: '',
    toDate: '',
    sort: 'desc',
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications with filters
  const { data: response, isLoading, error, refetch } = useQuery<NotificationResponse>({
    queryKey: ['notifications', filters],
    queryFn: async () => (await notificationApi.getAll(filters)).data,
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

  const updateFilter = useCallback((key: keyof NotificationFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      isRead: undefined,
      type: '',
      module: '',
      severity: '',
      search: '',
      fromDate: '',
      toDate: '',
      sort: 'desc',
      page: 1,
      limit: 20,
    });
  }, []);

  const notifications = response?.notifications ?? [];
  const total = response?.total ?? 0;
  const totalPages = response?.totalPages ?? 0;
  const currentPage = response?.page ?? 1;
  const unreadCount = countData?.count ?? 0;

  // Get unique modules and types for filter dropdowns
  const uniqueModules = useMemo(() => {
    const modules = new Set<string>();
    notifications.forEach(n => n.module && modules.add(n.module));
    return Array.from(modules).sort();
  }, [notifications]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    notifications.forEach(n => n.type && types.add(n.type));
    return Array.from(types).sort();
  }, [notifications]);

  const uniqueSeverities = useMemo(() => {
    const severities = new Set<string>();
    notifications.forEach(n => n.severity && severities.add(n.severity));
    return Array.from(severities).sort();
  }, [notifications]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-3" />
        Loading notifications...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-red-600">Error loading notifications</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            Manage your persistent notifications
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="search"
            placeholder="Search notifications..."
            className="w-64 sm:w-80"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          <Button
            size="sm"
            variant={filters.isRead === false ? 'default' : 'outline'}
            onClick={() => updateFilter('isRead', filters.isRead === false ? undefined : false)}
          >
            {filters.isRead === false ? 'Show All' : 'Unread Only'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <Card className="border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Module</label>
              <Select value={filters.module} onValueChange={(v) => updateFilter('module', v || '')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Modules</SelectItem>
                  {uniqueModules.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
              <Select value={filters.type} onValueChange={(v) => updateFilter('type', v || '')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
{uniqueTypes.map(t => (
                      <SelectItem key={t} value={t}>{formatTypeLabel(t)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Severity</label>
              <Select value={filters.severity} onValueChange={(v) => updateFilter('severity', v || '')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
{uniqueSeverities.map(s => (
                      <SelectItem key={s} value={s}>{formatSeverityLabel(s)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sort</label>
              <Select value={filters.sort} onValueChange={(v) => updateFilter('sort', v as 'asc' | 'desc')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">From Date</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.fromDate}
                onChange={(e) => updateFilter('fromDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">To Date</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.toDate}
                onChange={(e) => updateFilter('toDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Page Size</label>
              <Select value={String(filters.limit)} onValueChange={(v) => updateFilter('limit', parseInt(v, 10))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

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
              {filters.isRead === false
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${(() => {
                        const colors = generateColorFromString(notification.type);
                        return `${colors.bg} ${colors.text} ${colors.border}`;
                      })()}`}
                    >
                      {formatTypeLabel(notification.type)}
                    </span>
                    {notification.module && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {notification.module}
                      </span>
                    )}
                    {notification.severity && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${(() => {
                          const colors = getSeverityColors(notification.severity);
                          return `${colors.bg} ${colors.text} ${colors.border}`;
                        })()}`}
                      >
                        {formatSeverityLabel(notification.severity)}
                      </span>
                    )}
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
                  {notification.metadata && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View metadata
                      </summary>
                      <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(notification.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {notification.user && (
                      <span>by {notification.user.name} (@{notification.user.username})</span>
                    )}
                    {notification.referenceId && (
                      <span>Ref: {notification.referenceId}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                  {notification.navigationRoute && !notification.isRead && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleMarkAsRead(notification.id);
                        window.location.href = notification.navigationRoute!;
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      <span>View</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{((currentPage - 1) * (filters.limit ?? 20)) + 1}</span> to <span className="font-medium">{Math.min(currentPage * (filters.limit ?? 20), total)}</span> of <span className="font-medium">{total}</span> notifications
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => updateFilter('page', currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => updateFilter('page', currentPage + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            refetch();
            toast({ title: 'Notifications refreshed' });
          }}
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>
    </div>
  );
}