"use client";

import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { List, ListItem, ListItemText, IconButton, Button, Typography, Box } from "@mui/material";
import { X as CloseIcon, Check } from "lucide-react";
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

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationsModal({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Notifications</Typography>
          <Box>
            <Button
              onClick={onMarkAllAsRead}
              startIcon={<Check className="h-4 w-4" />}
              sx={{ mr: 1 }}
            >
              Mark all as read
            </Button>
            <IconButton onClick={onClose} size="small">
              <CloseIcon className="h-4 w-4" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {notifications.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  backgroundColor: notification.read ? 'transparent' : 'action.hover',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                secondaryAction={
                  !notification.read && (
                    <IconButton
                      edge="end"
                      onClick={() => onMarkAsRead(notification.id)}
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
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
} 