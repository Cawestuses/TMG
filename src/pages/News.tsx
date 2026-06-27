import { GlowCard } from "@/src/components/GlowCard";
import { NewsPost } from "@/src/types/gdps";
import { Calendar, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function News() {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        setNews(data);
      } catch (err) {
        console.error("Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  const formatText = (text: string) => {
    // Basic formatting: replace @Mentions with colored text, handle newlines
    const lines = text.split('\n');
    return lines.map((line, i) => (
      <span key={i}>
        {line.split(/(@[a-zA-Z0-9_]+)/g).map((part, j) => {
          if (part.startsWith('@')) {
            return <span key={j} className="text-primary font-medium">{part}</span>;
          }
          return <span key={j}>{part}</span>;
        })}
        {i !== lines.length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{t("news.title")}</h1>
        <p className="text-gray-400 text-lg">
          {t("news.subtitle")}
        </p>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">{t("news.loading")}</div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 text-gray-500">{t("news.empty")}</div>
        ) : (
          news.map((post, idx) => (
            <GlowCard key={post.id} delay={idx * 0.1} className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                <h2 className="text-2xl font-display font-bold text-white">{post.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                <p>{formatText(post.content)}</p>
              </div>
            </GlowCard>
          ))
        )}
      </div>
    </div>
  );
}
