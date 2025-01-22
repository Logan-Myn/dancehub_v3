"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Badge, IconButton, Popper, Paper, Box, Typography, List, ListItem, ListItemText, Button, ClickAwayListener } from "@mui/material";
import { createClient } from "@/lib/supabase/client";
import { Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  link?: string;
  type: 'course_published' | 'course_updated' | 'announcement' | 'other';
}

export default function NotificationsButton() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <div>
        <IconButton
          onClick={handleClick}
          sx={{ color: 'inherit' }}
        >
          <Badge badgeContent={unreadCount} color="error">
            <Bell className="h-5 w-5" />
          </Badge>
        </IconButton>

        <Popper
          open={open}
          anchorEl={anchorEl}
          placement="bottom-end"
          style={{ zIndex: 1300 }}
        >
          <Paper 
            sx={{ 
              width: 360, 
              maxHeight: '80vh',
              overflow: 'hidden',
              mt: 1,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box 
              sx={{ 
                p: 2, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="h6">Notifications</Typography>
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  startIcon={<Check className="h-4 w-4" />}
                  size="small"
                >
                  Mark all as read
                </Button>
              )}
            </Box>

            <List sx={{ maxHeight: 'calc(80vh - 60px)', overflow: 'auto' }}>
              {notifications.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="textSecondary">
                    No notifications yet
                  </Typography>
                </Box>
              ) : (
                notifications.map((notification) => (
                  <ListItem
                    key={notification.id}
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                    secondaryAction={
                      !notification.read && (
                        <IconButton
                          edge="end"
                          onClick={() => handleMarkAsRead(notification.id)}
                          size="small"
                        >
                          <Check className="h-4 w-4" />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Box component="a" href={notification.link || '#'} sx={{ textDecoration: 'none', color: 'inherit' }}>
                          {notification.title}
                        </Box>
                      }
                      secondary={
                        <>
                          {notification.message}
                          <br />
                          <Typography variant="caption" color="textSecondary">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Popper>
      </div>
    </ClickAwayListener>
  );
} 