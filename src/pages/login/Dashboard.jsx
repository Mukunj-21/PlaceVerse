import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function Dashboard() {
    const [email, setEmail] = useState("");
    const navigate = useNavigate();
    const db = getFirestore();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate("/login", { replace: true });
                return;
            }
            (async () => {
                try {
                    const ref = doc(db, "users", user.uid);
                    const snap = await getDoc(ref);
                    const approved = snap.exists() && snap.data()?.active === true;

                    if (!approved) {
                        await signOut(auth);
                        alert("Your account is not activated. Please contact the admin.");
                        navigate("/login", { replace: true });
                        return;
                    }
                    setEmail(user.email || "");
                } catch (e) {
                    // if Firestore fails, fail closed
                    await signOut(auth);
                    alert("Could not verify your account. Please contact the admin.");
                    navigate("/login", { replace: true });
                }
            })();
        });
        return () => unsub();
    }, [navigate, db]);

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.title}>You are logged in</h2>
                <p style={styles.sub}>{email}</p>
                <button onClick={() => signOut(auth)} style={styles.button}>
                    Logout
                </button>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#eef2ff",
        padding: "20px",
    },
    card: {
        width: "100%",
        maxWidth: "380px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        padding: "24px",
        textAlign: "center",
    },
    title: { margin: 0, marginBottom: "6px", fontSize: "20px" },
    sub: { marginTop: 0, marginBottom: "16px", color: "#6b7280", fontSize: "14px" },
    button: {
        padding: "10px 12px",
        border: "none",
        borderRadius: "8px",
        background: "#111827",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer",
    },
};
