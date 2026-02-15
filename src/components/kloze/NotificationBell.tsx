import { useState, useEffect } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  getNotificationIcon,
  formatNotificationTime,
  type Notification
} from "@/services/notificationService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load notifications
  const loadNotifications = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(userId, { limit: 50 }),
        getUnreadCount(userId)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(userId, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast for new notification
      toast(newNotification.title, {
        description: newNotification.message,
        icon: getNotificationIcon(newNotification.type)
      });
    });

    return unsubscribe;
  }, [userId]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate based on type
    if (notification.data?.pack_id) {
      setOpen(false);
      navigate(`/pack/${notification.data.pack_id}`);
    } else if (notification.data?.from_user_id) {
      setOpen(false);
      navigate(`/user/${notification.data.from_user_id}`);
    }
  };

  // Handle delete
  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification?.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    await deleteNotification(notificationId);
  };

  // Handle mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    toast.success("Tüm bildirimler okundu");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="glass-card gradient-dark border-white/10 w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Bildirimler
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {unreadCount} yeni
                </span>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs text-white/60 hover:text-white"
              >
                <Check className="w-3 h-3 mr-1" />
                Tümünü oku
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-white/60 text-sm mt-2">Yükleniyor...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-white/60">Henüz bildirim yok</p>
              <p className="text-white/40 text-sm mt-1">
                Birisi seni takip ettiğinde veya paketini beğendiğinde burada göreceksin
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors group",
                    notification.is_read
                      ? "bg-transparent hover:bg-white/5"
                      : "bg-primary/5 hover:bg-primary/10"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      notification.is_read ? "bg-muted/20" : "bg-primary/20"
                    )}>
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "font-medium text-sm",
                          notification.is_read ? "text-white/80" : "text-white"
                        )}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, notification.id)}
                        >
                          <X className="w-3 h-3 text-white/40 hover:text-red-400" />
                        </Button>
                      </div>
                      <p className="text-white/60 text-sm mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
