import api from '@/lib/api';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  module?: string;
  action?: string;
  severity?: string;
  referenceId?: string;
  activityLogId?: number;
  metadata?: any;
  navigationRoute?: string;
  userId?: number;
  user?: {
    id: number;
    username: string;
    name: string;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: string;
  module?: string;
  severity?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  type: string;
  userId?: number;
  module?: string;
  action?: string;
  severity?: string;
  referenceId?: string;
  activityLogId?: number;
  metadata?: any;
  navigationRoute?: string;
}

export const notificationApi = {
  getAll: (filters?: NotificationFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    return api.get<NotificationResponse>(`/notifications?${params.toString()}`);
  },
  getUnread: () => api.get<Notification[]>('/notifications/unread'),
  getRecent: () => api.get<Notification[]>('/notifications/recent'),
  getCount: () => api.get<{ count: number }>('/notifications/count'),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  create: (data: CreateNotificationDto) => api.post('/notifications', data),
};