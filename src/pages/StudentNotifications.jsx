// StudentNotifications.jsx
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase";
import AppHeader from "../components/AppHeader";
import { useNavigate } from "react-router-dom";

export default function StudentNotifications() {
  const [notifs, setNotifs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifs = async () => {
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchNotifs();
  }, []);

  return (
    <div className="stu-page">
      <AppHeader />
      <div className="stu-card">
        <div className="flex justify-between items-center mb-4">
          <h1 className="stu-title">Notifications</h1>
          <button className="stu-btn" onClick={() => navigate("/student")}>
            ← Back to Dashboard
          </button>
        </div>

        {notifs.length === 0 ? (
          <div className="stu-info">No notifications.</div>
        ) : (
          <ul className="space-y-3 mt-4">
            {notifs.map((n) => (
              <li key={n.id} className="p-3 rounded bg-slate-800">
                <div>{n.message}</div>
                <div className="text-xs text-slate-400">
                  {new Date(n.createdAt.seconds * 1000).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}