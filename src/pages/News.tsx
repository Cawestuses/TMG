import { GlowCard } from "@/src/components/GlowCard";
import { NewsPost } from "@/src/types/gdps";
import { Calendar, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function News() {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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

  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatTextLine = (line: string) => {
    return line.split(/(@[a-zA-Z0-9_]+)/g).map((part, j) => {
      if (part.startsWith('@')) {
        return <span key={j} className="text-primary font-medium">{part}</span>;
      }
      return <span key={j}>{part}</span>;
    });
  };

  const renderContent = (text: string) => {
    // Regex to match markdown image format: ![alt](url) OR video format: @[video](url)
    const mediaRegex = /(!\[.*?\]\(.*?\)|@\[video\]\(.*?\))/g;
    const parts = text.split(mediaRegex);

    return parts.map((part, index) => {
      const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const url = imgMatch[2];
        return (
          <div key={index} className="my-6 flex flex-col items-center group">
            <div className="relative overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-black/40 max-w-full md:max-w-2xl cursor-zoom-in transition-all duration-300 hover:border-primary/40 hover:shadow-primary/5">
              <img
                src={url}
                alt="News image"
                onClick={() => setZoomedImage(url)}
                className="max-h-[450px] w-auto max-w-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-[1.015]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3 pointer-events-none">
                <span className="text-xs text-white/90 font-medium truncate max-w-[80%]">Нажмите для увеличения</span>
                <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 uppercase tracking-wider font-semibold">Zoom</span>
              </div>
            </div>
          </div>
        );
      }

      const videoMatch = part.match(/@\[video\]\((.*?)\)/);
      if (videoMatch) {
        const url = videoMatch[1];
        const ytId = getYouTubeId(url);

        return (
          <div key={index} className="my-6 flex flex-col items-center w-full max-w-2xl mx-auto">
            {ytId ? (
              <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}`}
                  title="YouTube video player"
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                src={url}
                controls
                className="w-full max-h-[450px] rounded-xl border border-white/10 shadow-2xl bg-black"
              />
            )}
          </div>
        );
      }

      // Normal text
      const lines = part.split('\n');
      return (
        <span key={index}>
          {lines.map((line, i) => (
            <span key={i} className="block min-h-[0.5rem]">
              {formatTextLine(line)}
            </span>
          ))}
        </span>
      );
    });
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
                <div>{renderContent(post.content)}</div>
              </div>
            </GlowCard>
          ))
        )}
      </div>

      {/* Lightbox Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm transition-all duration-300 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors duration-200"
            onClick={() => setZoomedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed news attachment" 
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl border border-white/10 transition-transform duration-300 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
