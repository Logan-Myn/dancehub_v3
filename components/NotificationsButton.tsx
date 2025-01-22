"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@mui/material";
import { IconButton } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import NotificationsModal from "@/components/NotificationsModal";

export default function NotificationsButton() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(notifications || []);
    setUnreadCount(notifications?.filter(n => !n.read).length || 0);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    await fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return;
    }

    await fetchNotifications();
  };

  return (
    <>
      <IconButton
        onClick={() => setIsModalOpen(true)}
        sx={{ color: 'inherit' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Bell className="h-5 w-5" />
        </Badge>
      </IconButton>

      <NotificationsModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </>
  );
} 