import { useState, useEffect } from "react";
import { StaffMember, StaffCategory } from "@/src/types/gdps";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export function StaffAdmin() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Partial<StaffMember> | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      setStaff(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const token = localStorage.getItem("admin_token");
      const memberData = {
        nickname: editingMember.nickname || "",
        role: editingMember.role || "",
        category: editingMember.category || "private_server",
        socialLink: editingMember.socialLink || "",
        order: Number(editingMember.order) || 0,
      };

      const url = editingMember.id ? `/api/staff/${editingMember.id}` : "/api/staff";
      const method = editingMember.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(memberData)
      });

      if (!res.ok) throw new Error("Failed to save");

      setEditingMember(null);
      fetchStaff();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchStaff();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Управление командой</h2>
        <button
          onClick={() => setEditingMember({ category: "private_server", order: 0 })}
          className="bg-primary hover:brightness-110 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Добавить
        </button>
      </div>

      {editingMember && (
        <div className="bg-surface border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{editingMember.id ? "Редактирование" : "Новый участник"}</h3>
            <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Никнейм</label>
              <input
                required
                type="text"
                value={editingMember.nickname || ""}
                onChange={e => setEditingMember({ ...editingMember, nickname: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Роль/Должность</label>
              <input
                required
                type="text"
                value={editingMember.role || ""}
                onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Категория</label>
              <select
                required
                value={editingMember.category || "private_server"}
                onChange={e => setEditingMember({ ...editingMember, category: e.target.value as StaffCategory })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              >
                <option value="private_server">Стафф Приватки</option>
                <option value="discord_moderation">Модерация Discord</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Сортировка (меньше - выше)</label>
              <input
                required
                type="number"
                value={editingMember.order !== undefined ? editingMember.order : 0}
                onChange={e => setEditingMember({ ...editingMember, order: parseInt(e.target.value) })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">
                {editingMember.category === 'discord_moderation' ? 'Discord ник (опционально)' : 'Ник в Geometry Dash (опционально)'}
              </label>
              <input
                type="text"
                value={editingMember.socialLink || ""}
                onChange={e => setEditingMember({ ...editingMember, socialLink: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:brightness-110">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 animate-pulse">Загрузка...</div>
      ) : (
        <div className="space-y-4">
          {staff.map(member => (
            <div key={member.id} className="bg-surface border border-white/5 rounded-xl p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg">{member.nickname} <span className="text-sm font-normal text-gray-400 ml-2">({member.category})</span></h4>
                <div className="text-sm text-primary/80 mt-1">{member.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingMember(member)}
                  className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="p-2 text-red-400 hover:text-red-300 bg-red-400/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
