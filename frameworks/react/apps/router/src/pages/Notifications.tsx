import { useState, useEffect } from 'react';
import { createMockApi } from 'shared-data/mock-api';
import LoadingSkeleton from '../components/LoadingSkeleton';

const api = createMockApi();

interface Notification {
  id: number;
  message: string;
  read: boolean;
}

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.fetchNotifications(500).then((res) => {
      if (cancelled) return;
      setNotifications(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingSkeleton />;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>{unreadCount} unread of {notifications.length} total</p>
      </div>
      <div className="notification-list">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}
