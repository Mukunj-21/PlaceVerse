// src/pages/student/StudentNotifications.jsx
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.js";
import AppHeader from "../../components/AppHeader.jsx";
import { Link } from "react-router-dom";
import "/src/styles/Student.css";

export default function StudentNotifications() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'recent', 'important'

  useEffect(() => {
    const q = query(
      collection(db, "jobNotes"),
      where("pushed", "==", true),
      orderBy("pushedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        
        // Ensure stable ordering
        rows.sort((a, b) => {
          const A = a.pushedAt?.toDate?.() || a.createdAt?.toDate?.() || 0;
          const B = b.pushedAt?.toDate?.() || b.createdAt?.toDate?.() || 0;
          return B - A;
        });
        
        setNotes(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    const date = ts.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getNotificationIcon = (message) => {
    const msg = (message || "").toLowerCase();
    if (msg.includes('selected') || msg.includes('congratulations')) return '🎉';
    if (msg.includes('reject') || msg.includes('sorry')) return '😔';
    if (msg.includes('interview') || msg.includes('round')) return '📞';
    if (msg.includes('deadline') || msg.includes('apply')) return '⏰';
    if (msg.includes('update') || msg.includes('status')) return '📋';
    return '📢';
  };

  const getPriorityClass = (message) => {
    const msg = (message || "").toLowerCase();
    if (msg.includes('urgent') || msg.includes('deadline') || msg.includes('selected')) {
      return 'notification-high';
    }
    if (msg.includes('interview') || msg.includes('round')) {
      return 'notification-medium';
    }
    return 'notification-normal';
  };

  const filteredNotes = notes.filter(note => {
    if (filter === 'recent') {
      const noteDate = note.pushedAt?.toDate?.() || note.createdAt?.toDate?.();
      if (!noteDate) return false;
      const daysDiff = (Date.now() - noteDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }
    if (filter === 'important') {
      return getPriorityClass(note.message) === 'notification-high';
    }
    return true;
  });

  const renderSkeletonNotifications = () => (
    <>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="notification-card skeleton">
          <div className="notification-icon">
            <div className="skel" style={{width: '24px', height: '24px', borderRadius: '50%'}}></div>
          </div>
          <div className="notification-content">
            <div className="skel skel-line" style={{width: '80%', marginBottom: '8px'}}></div>
            <div className="skel skel-line" style={{width: '60%', height: '12px'}}></div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="student-page">
      <AppHeader />
      <div className="student-wrap">
        <div className="header-row">
          <Link to="/student/dashboard" className="stu-back">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="stu-title">Notifications</h1>
        <p className="stu-info">Stay updated with the latest announcements and job updates</p>

        {/* Stats */}
        <div className="notifications-stats">
          <div className="stat-item">
            <div className="stat-num">{notes.length}</div>
            <div className="stat-label">Total Notifications</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">
              {notes.filter(n => {
                const date = n.pushedAt?.toDate?.() || n.createdAt?.toDate?.();
                return date && (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
              }).length}
            </div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">
              {notes.filter(n => getPriorityClass(n.message) === 'notification-high').length}
            </div>
            <div className="stat-label">Important</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notes.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'recent' ? 'active' : ''}`}
            onClick={() => setFilter('recent')}
          >
            Recent ({notes.filter(n => {
              const date = n.pushedAt?.toDate?.() || n.createdAt?.toDate?.();
              return date && (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
            }).length})
          </button>
          <button 
            className={`filter-tab ${filter === 'important' ? 'active' : ''}`}
            onClick={() => setFilter('important')}
          >
            Important ({notes.filter(n => getPriorityClass(n.message) === 'notification-high').length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {loading ? (
            renderSkeletonNotifications()
          ) : filteredNotes.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-emoji">
                {filter === 'recent' ? '📅' : filter === 'important' ? '⭐' : '🔔'}
              </div>
              <h3>
                {filter === 'recent' ? 'No recent notifications' : 
                 filter === 'important' ? 'No important notifications' : 
                 'No notifications yet'}
              </h3>
              <p>
                {filter === 'recent' ? 'Check back later for new updates.' : 
                 filter === 'important' ? 'All caught up on important updates!' : 
                 'You\'ll see announcements and job updates here.'}
              </p>
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <div 
                key={note.id} 
                className={`notification-card ${getPriorityClass(note.message)}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="notification-icon">
                  {getNotificationIcon(note.message)}
                </div>
                <div className="notification-content">
                  <div className="notification-message">
                    {note.message}
                  </div>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {formatTime(note.pushedAt || note.createdAt)}
                    </span>
                    {getPriorityClass(note.message) === 'notification-high' && (
                      <span className="notification-priority">Important</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredNotes.length > 0 && (
          <div className="notifications-footer">
            <p className="notifications-count">
              Showing {filteredNotes.length} of {notes.length} notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
