import { useTranslation } from "react-i18next";
import { GlowCard } from "@/src/components/GlowCard";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Box, Music } from "lucide-react";
import { useEffect, useState } from "react";
import { ServerStats } from "@/src/types/gdps";

export function Home() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/server-stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats(data);
        }
      })
      .catch((err) => console.error("Error fetching stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 flex flex-col items-center text-center">
        {/* Abstract background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <h1 className="relative font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            {t("hero.title")}
          </span>
        </h1>
        
        <p className="relative text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
          {t("hero.subtitle")}
        </p>

        <div className="relative flex flex-wrap justify-center gap-4">
          <Link
            to="/downloads"
            className="px-8 py-4 rounded-xl bg-primary text-white font-medium hover:brightness-110 transition-colors flex items-center gap-2 shadow-[0_0_20px_-5px_var(--color-primary)]"
          >
            {t("hero.play_now")}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/faq"
            className="px-8 py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10"
          >
            {t("nav.faq")}
          </Link>
        </div>
      </section>

      {/* TMG List Section */}
      <section>
        <GlowCard delay={0.1} glowColor="primary" className="overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20" />
          
          <div className="p-8 md:p-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="text-center lg:text-left flex-1 relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-black mb-4 uppercase tracking-tight">
                <span className="text-white">{t("list.title_1")} </span>
                <span className="text-primary">{t("list.title_2")}</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-2xl">
                {t("list.subtitle")}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <a
                  href="https://list.tmgdps.su"
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-3.5 rounded-xl bg-primary text-background font-bold hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_var(--color-primary)] hover:shadow-[0_0_30px_-5px_var(--color-primary)] hover:-translate-y-0.5"
                >
                  {t("list.open_list")}
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="https://list.tmgdps.su/submit"
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-3.5 rounded-xl bg-surface text-white font-medium hover:bg-white/5 transition-colors border border-white/10 flex items-center gap-2"
                >
                  {t("list.submit_record")}
                </a>
              </div>
            </div>

            <div className="shrink-0 relative w-full lg:w-1/2 xl:w-5/12 hidden md:block">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-10 group">
                <img src="/public/uploads/list-preview.png" alt="TMG List Preview" className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute inset-0 bg-primary/20 blur-[50px] -z-10 rounded-full" />
            </div>
          </div>
        </GlowCard>
      </section>

      {/* Live Stats */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="text-2xl font-display font-bold">Live Statistics</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlowCard delay={0.1} className="p-6 flex flex-col items-center text-center" glowColor="primary">
            <Users className="w-8 h-8 text-primary mb-4" />
            <div className="text-3xl font-bold font-display mb-1">
              {loading ? "..." : stats?.accounts?.toLocaleString() || "0"}
            </div>
            <div className="text-sm text-gray-400">{t("stats.accounts")}</div>
          </GlowCard>
          
          <GlowCard delay={0.2} className="p-6 flex flex-col items-center text-center" glowColor="accent">
            <Box className="w-8 h-8 text-accent mb-4" />
            <div className="text-3xl font-bold font-display mb-1">
              {loading ? "..." : stats?.levels?.toLocaleString() || "0"}
            </div>
            <div className="text-sm text-gray-400">{t("stats.levels")}</div>
          </GlowCard>
          
          <GlowCard delay={0.4} className="p-6 flex flex-col items-center text-center" glowColor="accent">
            <Music className="w-8 h-8 text-pink-500 mb-4" />
            <div data-testid="songs-count" className="text-3xl font-bold font-display mb-1">
              {loading ? "..." : stats?.songs?.toLocaleString() || "0"}
            </div>
            <div className="text-sm text-gray-400">{t("stats.songs")}</div>
          </GlowCard>
        </div>
      </section>
    </div>
  );
}
