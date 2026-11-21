import api from '@/lib/api';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
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

export interface CreateNotificationDto {
  title: string;
  message: string;
  type: string;
  userId?: number;
}

export const notificationApi = {
  getAll: () => api.get<Notification[]>('/notifications'),
  getUnread: () => api.get<Notification[]>('/notifications/unread'),
  getRecent: () => api.get<Notification[]>('/notifications/recent'),
  getCount: () => api.get<{ count: number }>('/notifications/count'),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  create: (data: CreateNotificationDto) => api.post('/notifications', data),
};