import { GlowCard } from "@/src/components/GlowCard";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FAQ() {
  const { t } = useTranslation();
  const [faqs, setFaqs] = useState<{ id: string, question: string, answer: string, order?: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch("/api/faq");
        const data = await res.json();
        setFaqs(data);
      } catch (err) {
        console.error("Error fetching FAQs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFaqs();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{t("faq.title")}</h1>
        <p className="text-gray-400 text-lg">
          {t("faq.subtitle")}
        </p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse">{t("faq.loading")}</div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-10 text-gray-500">{t("faq.empty")}</div>
        ) : (
          faqs.map((faq, idx) => (
            <FAQItem key={faq.id} question={faq.question} answer={faq.answer} delay={idx * 0.1} />
          ))
        )}
      </div>
    </div>
  );
}

function FAQItem({ question, answer, delay }: { question: string, answer: string, delay: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <GlowCard delay={delay} glowColor="none" className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
      >
        <span className="font-display font-medium text-lg">{question}</span>
        <ChevronDown 
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`} 
        />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 text-gray-400 whitespace-pre-line leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlowCard>
  );
}
