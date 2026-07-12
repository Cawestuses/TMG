import React, { useState, useEffect } from "react";
import { NewsPost } from "@/src/types/gdps";
import { Plus, Edit2, Trash2, X, Image, Upload, Link, Video } from "lucide-react";

export function NewsAdmin() {
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Partial<NewsPost> | null>(null);

  // States for the integrated image tool
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [gallery, setGallery] = useState<string[]>([]);

  // States for the integrated video tool
  const [videoUrlInput, setVideoUrlInput] = useState("");

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

  // Helper to insert markdown image exactly at cursor position in textarea
  const insertAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById("news-content-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      // Fallback: append to content
      setEditingPost(prev => prev ? { ...prev, content: (prev.content || "") + textToInsert } : prev);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = editingPost?.content || "";

    const newContent = currentContent.substring(0, start) + textToInsert + currentContent.substring(end);
    setEditingPost(prev => prev ? { ...prev, content: newContent } : prev);

    // Refocus and place cursor directly after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 50);
  };

  // Upload image as multipart/form-data
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload");
      }

      const data = await res.json();
      insertAtCursor(`![](${data.url})`);
      setGallery(prev => [data.url, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Не удалось загрузить изображение. Убедитесь, что размер файла не превышает лимит.");
    } finally {
      setUploading(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Управление новостями</h2>
        <button
          onClick={() => {
            setEditingPost({});
            setGallery([]);
          }}
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
          
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm text-gray-400 mb-1">Автор</label>
                <input
                  required
                  type="text"
                  value={editingPost.author || ""}
                  onChange={e => setEditingPost({ ...editingPost, author: e.target.value })}
                  className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            {/* Premium Integrated Image Uploader Block */}
            <div className="bg-background/30 border border-white/5 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Image className="w-4 h-4" />
                <span>Встраиваемые изображения (Картинки)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drag & Drop File Upload Area */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("image-file-input")?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[130px] ${
                    dragActive 
                      ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5" 
                      : "border-white/10 hover:border-primary/20 bg-background/20 hover:bg-background/40 text-gray-400"
                  }`}
                >
                  <input 
                    type="file" 
                    id="image-file-input" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className={`w-7 h-7 mb-2 transition-transform duration-300 ${uploading ? "animate-bounce text-primary" : "text-gray-500 group-hover:scale-110"}`} />
                  <span className="text-xs font-semibold text-gray-300">
                    {uploading ? "Загрузка изображения..." : "Перетащите картинку сюда"}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1">или нажмите, чтобы выбрать файл</span>
                </div>

                {/* Manual Link Input */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Ссылка на стороннее изображение (URL)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/some-image.jpg"
                        value={imageUrlInput}
                        onChange={e => setImageUrlInput(e.target.value)}
                        className="w-full bg-background border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-primary/40 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={!imageUrlInput}
                    onClick={() => {
                      insertAtCursor(`![](${imageUrlInput})`);
                      setImageUrlInput("");
                    }}
                    className="w-full bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 text-xs text-white py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Link className="w-3.5 h-3.5 text-primary" />
                    Вставить картинку по ссылке
                  </button>
                </div>
              </div>

              {/* Dynamic Session Gallery */}
              {gallery.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Загруженные за сессию (нажмите для повторной вставки):</div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {gallery.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => insertAtCursor(`![](${url})`)}
                        className="w-12 h-12 rounded-lg border border-white/10 bg-black/40 overflow-hidden cursor-pointer hover:border-primary transition-all flex-shrink-0 relative group"
                        title="Нажмите, чтобы вставить в text"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition-opacity">
                          +
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Premium YouTube Video Embed Block */}
            <div className="bg-background/30 border border-white/5 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Video className="w-4 h-4" />
                <span>Встраиваемое видео YouTube</span>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] text-gray-400 mb-1">Ссылка на YouTube видео (или Shorts)</label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/..."
                    value={videoUrlInput}
                    onChange={e => setVideoUrlInput(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-primary/40 focus:outline-none"
                  />
                </div>
                
                <button
                  type="button"
                  disabled={!videoUrlInput}
                  onClick={() => {
                    insertAtCursor(`@[video](${videoUrlInput})`);
                    setVideoUrlInput("");
                  }}
                  className="bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 text-xs text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none h-9 flex-shrink-0"
                >
                  <Link className="w-3.5 h-3.5 text-primary" />
                  Вставить YouTube видео
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Текст новости (поддерживает переносы, @упоминания, картинки и видео)
              </label>
              <textarea
                id="news-content-textarea"
                required
                rows={8}
                value={editingPost.content || ""}
                onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40 font-sans text-sm leading-relaxed"
                placeholder="Напишите текст новости. Используйте инструменты выше, чтобы вставлять картинки и видео прямо в нужные места текста..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Отмена
              </button>
              <button 
                type="submit" 
                className="bg-primary text-white px-6 py-2 rounded-lg hover:brightness-110 transition-all text-sm font-semibold shadow-lg shadow-primary/10"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 animate-pulse py-8 text-center">Загрузка списка новостей...</div>
      ) : (
        <div className="space-y-4">
          {news.length === 0 ? (
            <div className="text-gray-500 text-center py-12 border border-white/5 bg-surface/30 rounded-xl">
              Список новостей пуст. Добавьте первую новость!
            </div>
          ) : (
            news.map(post => (
              <div key={post.id} className="bg-surface border border-white/5 rounded-xl p-4 flex justify-between items-start hover:border-white/10 transition-colors">
                <div>
                  <h4 className="font-bold text-lg text-white">{post.title}</h4>
                  <div className="text-sm text-gray-400 mt-1 flex gap-4">
                    <span>Автор: {post.author}</span>
                    <span>Дата: {new Date(post.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPost(post);
                      setGallery([]);
                    }}
                    className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-2 text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
