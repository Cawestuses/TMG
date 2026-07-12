import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export function FaqAdmin() {
  const [faqs, setFaqs] = useState<{ id?: string, question: string, answer: string, order?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState<{ id?: string, question: string, answer: string, order?: number } | null>(null);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/faq");
      const data = await res.json();
      setFaqs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;

    try {
      const token = localStorage.getItem("admin_token");
      const faqData = {
        question: editingFaq.question || "",
        answer: editingFaq.answer || "",
        order: Number(editingFaq.order) || 0,
      };

      const url = editingFaq.id ? `/api/faq/${editingFaq.id}` : "/api/faq";
      const method = editingFaq.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(faqData)
      });

      if (!res.ok) throw new Error("Failed to save");

      setEditingFaq(null);
      fetchFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/faq/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Управление FAQ</h2>
        <button
          onClick={() => setEditingFaq({ question: "", answer: "", order: 0 })}
          className="bg-primary hover:brightness-110 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Добавить
        </button>
      </div>

      {editingFaq && (
        <div className="bg-surface border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">{editingFaq.id ? "Редактирование" : "Новый вопрос"}</h3>
            <button onClick={() => setEditingFaq(null)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Вопрос</label>
              <input
                required
                type="text"
                value={editingFaq.question || ""}
                onChange={e => setEditingFaq({ ...editingFaq, question: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ответ</label>
              <textarea
                required
                rows={4}
                value={editingFaq.answer || ""}
                onChange={e => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Сортировка (меньше - выше)</label>
              <input
                required
                type="number"
                value={editingFaq.order !== undefined ? editingFaq.order : 0}
                onChange={e => setEditingFaq({ ...editingFaq, order: parseInt(e.target.value) })}
                className="w-full max-w-xs bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="pt-2">
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
          {faqs.map(faq => (
            <div key={faq.id} className="bg-surface border border-white/5 rounded-xl p-4 flex justify-between items-start gap-4">
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1">{faq.question}</h4>
                <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">{faq.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditingFaq(faq)}
                  className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(faq.id as string)}
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
