import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, query, where, orderBy, onSnapshot, limit as fsLimit } from 'firebase/firestore';
import { firebaseApp } from '../lib/firebase';

const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [tugasNotifications, setTugasNotifications] = useState([]);
  const [surveyNotifications, setSurveyNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (type = null) => {
    if (!userId) {
      // If no userId, set empty arrays and return
      setNotifications([]);
      setTugasNotifications([]);
      setSurveyNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = type 
        ? `/api/notifications?userId=${encodeURIComponent(userId)}&type=${type}`
        : `/api/notifications?userId=${encodeURIComponent(userId)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        // If it's a 404 or similar, just return empty data instead of throwing
        if (response.status === 404 || response.status === 500) {
          console.warn('Notifications API not available, using empty data');
          const emptyData = [];
          
          if (type) {
            if (type === 'tugas') {
              setTugasNotifications(emptyData);
            } else if (type === 'survey') {
              setSurveyNotifications(emptyData);
            }
          } else {
            setNotifications(emptyData);
            setTugasNotifications(emptyData);
            setSurveyNotifications(emptyData);
            setUnreadCount(0);
          }
          return;
        }
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure data is an array
      const notifications = Array.isArray(data) ? data : [];
      
      if (type) {
        if (type === 'tugas') {
          setTugasNotifications(notifications);
        } else if (type === 'survey') {
          setSurveyNotifications(notifications);
        }
      } else {
        setNotifications(notifications);
        
        // Separate notifications by type
        const tugasNotifs = notifications.filter(n => n.type === 'tugas');
        const surveyNotifs = notifications.filter(n => n.type === 'survey');
        
        setTugasNotifications(tugasNotifs);
        setSurveyNotifications(surveyNotifs);
        
        // Count unread notifications
        const unread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
      
      // Set empty data on error to prevent UI crashes
      if (type) {
        if (type === 'tugas') {
          setTugasNotifications([]);
        } else if (type === 'survey') {
          setSurveyNotifications([]);
        }
      } else {
        setNotifications([]);
        setTugasNotifications([]);
        setSurveyNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      console.log('📝 Marking notification as read:', notificationId);
      
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          isRead: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark notification as read');
      }

      console.log('✅ Notification marked as read successfully');

      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      setTugasNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      setSurveyNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('❌ Error marking notification as read:', err);
      // Revert local state on error
      setError('Gagal menandai notifikasi sebagai dibaca');
    }
  }, []);

  // Create new notification (for testing purposes)
  const createNotification = useCallback(async (notificationData) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const result = await response.json();
      
      // Refresh notifications after creating new one
      await fetchNotifications();
      
      return result;
    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  }, [fetchNotifications]);

  // Format date for display
  const formatNotificationDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Baru saja' : `${diffInMinutes} menit lalu`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} jam lalu`;
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }, []);

  // Realtime subscription via Firestore onSnapshot with fallback
  useEffect(() => {
    if (!userId) {
      console.log('🔕 No userId provided, skipping notifications subscription');
      return;
    }

    console.log('🔔 Setting up realtime notifications for user:', userId);
    
    let unsubscribe = null;
    
    try {
    const db = getFirestore(firebaseApp);
    const notifsRef = collection(db, 'notifications');
    
    // Gunakan query yang lebih sederhana untuk menghindari index requirement
    const q = query(
      notifsRef,
      where('userId', '==', userId),
      fsLimit(50)
    );

      unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📨 Received notifications update:', snapshot.docs.length, 'notifications');
        
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
          };
        });
        
        // Sort by createdAt descending (newest first) di client-side
        const sortedList = list.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        setNotifications(sortedList);
        setTugasNotifications(sortedList.filter(n => n.type === 'tugas'));
        setSurveyNotifications(sortedList.filter(n => n.type === 'survey'));
        
        const unread = sortedList.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        setError(null); // Clear any previous errors
        
        console.log('📊 Notifications stats:', {
          total: sortedList.length,
          tugas: sortedList.filter(n => n.type === 'tugas').length,
          survey: sortedList.filter(n => n.type === 'survey').length,
          unread: unread
        });
      }, (err) => {
        console.error('❌ Realtime notifications error:', err);
        
        // Check if it's an index error
        if (err.message && err.message.includes('requires an index')) {
          console.log('🔧 Index error detected, falling back to API...');
          setError('Firebase memerlukan index. Menggunakan fallback API.');
        } else {
          console.log('🔄 Falling back to API-based notifications...');
        }
        
        // Fallback to API-based notifications
        fetchNotifications().catch(apiErr => {
          console.error('❌ API fallback also failed:', apiErr);
          setError('Gagal memuat notifikasi. Silakan refresh halaman atau buat index Firebase.');
        });
      });
    } catch (setupError) {
      console.error('❌ Error setting up realtime notifications:', setupError);
      console.log('🔄 Falling back to API-based notifications...');
      
      // Fallback to API-based notifications
      fetchNotifications().catch(apiErr => {
        console.error('❌ API fallback also failed:', apiErr);
        setError('Gagal memuat notifikasi. Silakan refresh halaman.');
      });
    }

    return () => {
      console.log('🔕 Cleaning up notifications subscription');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, fetchNotifications]);

  // Refresh specific type of notifications
  const refreshNotifications = useCallback((type = null) => {
    fetchNotifications(type);
  }, [fetchNotifications]);

  return {
    notifications,
    tugasNotifications,
    surveyNotifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    createNotification,
    refreshNotifications,
    formatNotificationDate
  };
};

export default useNotifications;
