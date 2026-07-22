import { GlowCard } from "@/src/components/GlowCard";
import { Download, Monitor, Smartphone, Wrench, HardDrive, ExternalLink, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Downloads() {
  const { t } = useTranslation();

  const downloadLinks = [
    {
      title: "Android (.apk)",
      icon: <Smartphone className="w-6 h-6" />,
      description: t("downloads.desc_android"),
      version: "2.2081",
      links: [
        { label: t("downloads.btn_gdrive"), url: "https://drive.google.com/file/d/1uRtqdx7K4__j6YCRsR8MjA9MJkg5KiZQ/view" },
        { label: t("downloads.btn_alternative"), url: "https://buildercdn.forever-host.xyz/download/n01/0004?platform=android", secondary: true }
      ]
    },
    {
      title: "Windows (.zip)",
      icon: <Monitor className="w-6 h-6" />,
      description: t("downloads.desc_windows"),
      version: "2.2081",
      links: [
        { label: t("downloads.btn_gdrive"), url: "https://drive.google.com/file/d/1zNUNfJr5TD6qwqRehEMY4eWEvI31PQvg/view" },
        { label: t("downloads.btn_alternative"), url: "https://buildercdn.forever-host.xyz/download/n01/0004?platform=windows", secondary: true }
      ]
    },
    {
      title: "Windows + Geode",
      icon: <Monitor className="w-6 h-6 text-accent" />,
      description: t("downloads.desc_windows_geode"),
      version: "2.2081",
      links: [
        { label: t("downloads.btn_archive"), url: "https://drive.google.com/file/d/1_FWOgpAUtUP-JF0NrGQijQRgLfokNLcJ/view" }
      ]
    },
    {
      title: "Android Geode 1.8.0",
      icon: <Smartphone className="w-6 h-6 text-accent" />,
      description: t("downloads.desc_android_geode_180"),
      version: "⇐ 2.208",
      links: [
        { label: t("downloads.btn_apk"), url: "https://drive.google.com/file/d/1amYga7queRyH_SOishryCvhrGbOiMdL8/view?usp=drivesdk" }
      ]
    },
    {
      title: "Android Geode 1.6.1",
      icon: <Smartphone className="w-6 h-6 text-gray-400" />,
      description: t("downloads.desc_android_geode_161"),
      version: "⇐ 2.207",
      links: [
        { label: t("downloads.btn_apk"), url: "https://drive.google.com/file/d/1RAOr2QD7XtdExyYxyvD-PvAGUDyFclz7/view" }
      ]
    },
    {
      title: "Visual Studio Redistributables",
      icon: <Wrench className="w-6 h-6 text-orange-400" />,
      description: t("downloads.desc_vs"),
      version: "Win 2008-2022",
      links: [
        { label: t("downloads.btn_pack"), url: "https://drive.google.com/file/d/1O-7bjXIBeQArpQEuQ42hxx3XZL56dEXr/view" }
      ]
    }
  ];

  const usefulLinks = [
    { label: t("downloads.link_switcher"), url: "https://n01.forever-host.xyz/0004", copyOnly: true },
    { label: t("downloads.link_panel"), url: "https://n01.forever-host.xyz/0004/panel" },
  ];

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert(t("downloads.switcher_copied"));
    } catch (error) {
      console.error("Copy failed:", error);
      alert(t("downloads.switcher_copy_error"));
    }
  };

  return (
    <div className="space-y-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{t("downloads.title")}</h1>
        <p className="text-gray-400 text-lg">
          {t("downloads.subtitle")}<span className="text-white font-medium">{t("downloads.version")}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {downloadLinks.map((item, idx) => (
          <GlowCard key={idx} delay={idx * 0.1} className="p-6 flex flex-col h-full" glowColor={idx % 2 === 0 ? "primary" : "accent"}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display">{item.title}</h3>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-md">
                    {item.version}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-gray-400 mb-8 flex-1">{item.description}</p>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              {item.links.map((link, lidx) => (
                <a
                  key={lidx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
                    link.secondary 
                      ? "bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300" 
                      : "bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20"
                  } flex-1`}
                >
                  <Download className="w-4 h-4" />
                  {link.label}
                </a>
              ))}
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Useful Links */}
      <section className="mt-16 pt-12 border-t border-white/10">
        <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
          <HardDrive className="text-primary" /> {t("downloads.useful_resources")}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {usefulLinks.map((link, idx) => (
            link.copyOnly ? (
              <button
                key={idx}
                type="button"
                onClick={() => handleCopyLink(link.url)}
                className="flex items-center justify-between p-4 rounded-xl bg-surface border border-white/5 hover:border-white/20 transition-all hover:bg-white/5 group text-left"
              >
                <span className="font-medium text-gray-200 group-hover:text-white">{link.label}</span>
                <span className="flex items-center gap-2 text-sm text-primary opacity-90">
                  <Copy className="w-4 h-4" />
                  {t("downloads.copy")}
                </span>
              </button>
            ) : (
              <a 
                key={idx} 
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 rounded-xl bg-surface border border-white/5 hover:border-white/20 transition-all hover:bg-white/5 group"
              >
                <span className="font-medium text-gray-200 group-hover:text-white">{link.label}</span>
                <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
              </a>
            )
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200/80 text-sm">
          <strong>{t("downloads.attention")}</strong> {t("downloads.attention_text")}
        </div>
      </section>
    </div>
  );
}
