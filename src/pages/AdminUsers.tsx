import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Trash2, Shield, Loader2 } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useUser } from "../contexts/UserContext";

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  role: "admin" | "user";
  displayName?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser, logout } = useUser();

  useEffect(() => {
    if (!currentUser) return;

    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`¿Cambiar el rol de este usuario a ${newRole}?`)) return;

    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-neutral-50 font-sans">
      <Helmet>
        <title>Gestionar Usuarios | Vida Mixe TV</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <Link to="/admin-news" className="p-2 hover:bg-brand-surface rounded-full transition-colors text-neutral-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
          </div>
          <button onClick={() => logout()} className="text-sm text-red-400 hover:text-red-300">Cerrar Sesión</button>
        </div>

        {error && <p className="text-red-500 mb-6">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
          </div>
        ) : (
          <div className="bg-brand-surface border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Email</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Rol</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{user.displayName || "Sin nombre"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400 text-sm">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === "admin" ? "bg-brand-primary/20 text-brand-primary" : "bg-neutral-500/20 text-neutral-500"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleRole(user.id, user.role)}
                          className="p-2 text-neutral-500 hover:text-brand-primary transition-colors"
                          title="Cambiar Rol"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
