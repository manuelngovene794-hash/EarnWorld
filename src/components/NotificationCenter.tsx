import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Coins, 
  ShieldAlert, 
  Gift, 
  ExternalLink,
  X,
  Clock,
  ArrowRight
} from 'lucide-react';
import { AppNotification } from '../types';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';

interface NotificationCenterProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateTab }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const userId = currentUser?.id || 'guest';
    const notifs = await storageService.getNotifications(userId);
    setNotifications(notifs);
  };

  useEffect(() => {
    loadNotifications();

    const handleSync = () => {
      loadNotifications();
    };

    window.addEventListener('earnworld_storage_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('earnworld_storage_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [currentUser]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (notifId: string, linkTab?: string) => {
    const userId = currentUser?.id || 'guest';
    await storageService.markNotificationAsRead(userId, notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    if (linkTab && onNavigateTab) {
      onNavigateTab(linkTab);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    const userId = currentUser?.id || 'guest';
    await storageService.markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'withdrawal':
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case 'task':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      case 'announcement':
        return <ShieldAlert className="w-4 h-4 text-indigo-400" />;
      default:
        return <Gift className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      return `Há ${diffDays} d`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white transition-all shadow-sm flex items-center justify-center"
        title="Notificações & Avisos"
        aria-label="Abrir Notificações"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Notificações</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Ler todas</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-slate-950/30 border-b border-slate-800/60 flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeFilter === 'unread'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Nenhuma notificação {activeFilter === 'unread' ? 'não lida' : ''} no momento.</p>
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id, notif.linkTab)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    !notif.read ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-800/40 opacity-80'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.linkTab && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold mt-1 hover:underline">
                        <span>Ver detalhes</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-center">
            <span className="text-[10px] text-slate-400">
              Notificações em tempo real sobre tarefas, aprovações de saque e novidades.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
