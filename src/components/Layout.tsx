import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/src/lib/utils";
import { Gamepad2, Download, Menu, X, Globe, Users, HelpCircle, Newspaper } from "lucide-react";
import { useState } from "react";

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: "/", label: t("nav.home"), icon: <Gamepad2 className="w-4 h-4" /> },
    { path: "/downloads", label: t("nav.downloads"), icon: <Download className="w-4 h-4" /> },
    { path: "/news", label: t("nav.news"), icon: <Newspaper className="w-4 h-4" /> },
    { path: "/faq", label: t("nav.faq"), icon: <HelpCircle className="w-4 h-4" /> },
    { path: "/staff", label: t("nav.staff"), icon: <Users className="w-4 h-4" /> },
  ];

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "ru" ? "en" : "ru");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="TMGDPS Logo" className="w-8 h-8 rounded-full object-cover" />
                <span className="font-display font-bold text-xl tracking-tight">TMGDPS</span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === link.path
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <button
                onClick={toggleLanguage}
                className="ml-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2 uppercase font-medium text-xs tracking-wider"
                title="Toggle Language"
              >
                <Globe className="w-5 h-5" />
                {i18n.language}
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-400 hover:text-white uppercase font-medium text-xs"
              >
                {i18n.language}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-400 hover:text-white"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-surface">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium",
                    location.pathname === link.path
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span>&copy; {new Date().getFullYear()} TMGDPS.</span>
            <span>{t("footer.rights", "All rights reserved.")}</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link to="/admin" className="hover:text-white transition-colors flex items-center gap-1">
              {t("footer.admin", "Админ-панель")}
            </Link>
            <a href="https://discord.gg/UyfCzGug4d" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
