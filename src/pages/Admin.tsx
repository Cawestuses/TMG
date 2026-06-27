import { useState, useEffect } from "react";
import { AuthPanel } from "./admin/AuthPanel";
import { NewsAdmin } from "./admin/NewsAdmin";
import { StaffAdmin } from "./admin/StaffAdmin";
import { FaqAdmin } from "./admin/FaqAdmin";
import { LogOut, LayoutDashboard } from "lucide-react";

export function Admin() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"news" | "staff" | "faq">("news");

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setToken(null);
  };

  if (!token) {
    return <AuthPanel onAuth={(t) => setToken(t)} />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Панель управления</h1>
            <p className="text-sm text-gray-400">Admin</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab("news")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "news" 
              ? "bg-primary text-white" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Новости
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "staff" 
              ? "bg-primary text-white" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Команда (Стафф)
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "faq" 
              ? "bg-primary text-white" 
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          FAQ
        </button>
      </div>

      <div className="mt-8">
        {activeTab === "news" && <NewsAdmin />}
        {activeTab === "staff" && <StaffAdmin />}
        {activeTab === "faq" && <FaqAdmin />}
      </div>
    </div>
  );
}
