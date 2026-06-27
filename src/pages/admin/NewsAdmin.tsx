import { useState, useEffect } from "react";
import { NewsPost } from "@/src/types/gdps";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export function NewsAdmin() {
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Partial<NewsPost> | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      setNews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    try {
      const token = localStorage.getItem("admin_token");
      const postData = {
        title: editingPost.title || "",
        content: editingPost.content || "",
        author: editingPost.author || "Admin",
        date: editingPost.date || new Date().toISOString(),
      };

      const url = editingPost.id ? `/api/news/${editingPost.id}` : "/api/news";
      const method = editingPost.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      if (!res.ok) throw new Error("Failed to save");

      setEditingPost(null);
      fetchNews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/news/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchNews();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Управление новостями</h2>
        <button
          onClick={() => setEditingPost({})}
          className="bg-primary hover:brightness-110 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Добавить
        </button>
      </div>

      {editingPost && (
        <div className="bg-surface border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{editingPost.id ? "Редактирование" : "Новая новость"}</h3>
            <button onClick={() => setEditingPost(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Заголовок</label>
              <input
                required
                type="text"
                value={editingPost.title || ""}
                onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Текст (поддерживает переносы и @упоминания)</label>
              <textarea
                required
                rows={5}
                value={editingPost.content || ""}
                onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Автор</label>
              <input
                required
                type="text"
                value={editingPost.author || ""}
                onChange={e => setEditingPost({ ...editingPost, author: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:brightness-110">
              Сохранить
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 animate-pulse">Загрузка...</div>
      ) : (
        <div className="space-y-4">
          {news.map(post => (
            <div key={post.id} className="bg-surface border border-white/5 rounded-xl p-4 flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg">{post.title}</h4>
                <div className="text-sm text-gray-400 mt-1 flex gap-4">
                  <span>Автор: {post.author}</span>
                  <span>Дата: {new Date(post.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingPost(post)}
                  className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
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
