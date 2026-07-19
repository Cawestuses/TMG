import React, { useState, useEffect } from "react";
import { GlowCard } from "@/src/components/GlowCard";
import { StaffMember } from "@/src/types/gdps";
import { Users, Shield, Gamepad2, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Staff() {
  const { t } = useTranslation();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch("/api/staff");
        const data = await res.json();
        setStaffList(data);
      } catch (err) {
        console.error("Error fetching staff:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);

  const privateServerStaff = staffList.filter(s => s.category === "private_server");
  const discordStaff = staffList.filter(s => s.category === "discord_moderation");

  const StaffGrid = ({ members, icon, title }: { members: StaffMember[], icon: React.ReactNode, title: string }) => (
    <div className="mb-16">
      <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-3 border-b border-white/5 pb-4">
        {icon} {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {members.map((member, idx) => (
          <GlowCard key={member.id} delay={idx * 0.1} glowColor={member.role.toLowerCase() === 'admin' ? 'accent' : 'primary'}>
            <div className="p-6 flex items-center gap-4">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt={member.nickname} className="w-12 h-12 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-surface border border-white/10 flex items-center justify-center font-bold text-xl uppercase bg-gradient-to-br from-gray-800 to-gray-900 shadow-inner">
                  {member.nickname.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{member.nickname}</h3>
                <p className="text-sm text-primary/80">{member.role}</p>
              </div>
              {member.socialLink && (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 whitespace-nowrap">
                  {member.category === "private_server" ? (
                    <Gamepad2 className="w-4 h-4 text-primary" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-[#5865F2]" />
                  )}
                  <span className="font-medium tracking-wide">{member.socialLink}</span>
                </div>
              )}
            </div>
          </GlowCard>
        ))}
        {members.length === 0 && !loading && (
          <div className="col-span-full text-center py-10 text-gray-500">
            {t("staff.empty")}
          </div>
        )}
        {loading && (
          <div className="col-span-full text-center py-10 text-gray-500 animate-pulse">
            {t("staff.loading")}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">{t("staff.title")}</h1>
        <p className="text-gray-400 text-lg">
          {t("staff.subtitle")}
        </p>
      </div>

      <StaffGrid 
        title={t("staff.private_server")} 
        icon={<Users className="w-6 h-6 text-primary" />} 
        members={privateServerStaff} 
      />
      
      <StaffGrid 
        title={t("staff.discord_moderation")} 
        icon={<Shield className="w-6 h-6 text-accent" />} 
        members={discordStaff} 
      />
    </div>
  );
}
