import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      "nav": {
        "home": "Главная",
        "downloads": "Скачать",
        "news": "Новости",
        "faq": "Частые вопросы",
        "staff": "Команда"
      },
      "footer": {
        "rights": "Все права защищены.",
        "admin": "Админ-панель"
      },
      "hero": {
        "title": "TMGDPS",
        "subtitle": "Лучший приватный сервер Geometry Dash с кастомными возможностями",
        "play_now": "Начать играть"
      },
      "list": {
        "title_1": "TMG",
        "title_2": "LIST",
        "subtitle": "Официальный рейтинг сложнейших уровней сервера. Изучайте топ демонов, следите за статистикой лучших игроков и отправляйте свои собственные рекорды для попадания в лидерборд!",
        "open_list": "Открыть Лист",
        "submit_record": "Отправить рекорд"
      },
      "stats": {
        "accounts": "Аккаунтов",
        "levels": "Уровней",
        "rates": "Оцененных уровней",
        "songs": "Песен"
      },
      "downloads": {
        "title": "Загрузки",
        "subtitle": "Скачайте актуальные версии клиента TMG DPS для вашего устройства. Версия приватки: ",
        "version": "V. 2.2081",
        "desc_android": "Основная версия клиента для Android устройств.",
        "desc_windows": "Основная версия клиента для ПК (Windows).",
        "desc_windows_geode": "Пропатченный гдпс, работает с геодом на windows XP x64+.",
        "desc_android_geode_180": "Версия клиента с поддержкой модов (Geode).",
        "desc_android_geode_161": "Старая версия клиента с поддержкой модов.",
        "desc_vs": "Помогает убрать ошибки 0xc0150002, msvcr100.dll, msvcr120.dll, vcruntime140.dll.",
        "btn_gdrive": "Скачать с Google Drive",
        "btn_alternative": "Альтернатива (BuilderCDN)",
        "btn_archive": "Скачать архив (.zip)",
        "btn_apk": "Скачать .apk",
        "btn_pack": "Скачать сборник",
        "useful_resources": "Полезные ресурсы",
        "link_switcher": "GDPS Switcher",
        "link_panel": "Личный кабинет (Музыка / Активация)",
        "attention": "Внимание:",
        "attention_text": "Для пользователей старых ОС доступны дополнения: One Core Api (для Windows XP), Second System (для Vista), VxKex (для Windows 7)."
      },
      "faq": {
        "title": "Частые вопросы",
        "subtitle": "Ответы на самые популярные вопросы по серверу TMG DPS.",
        "loading": "Загрузка вопросов...",
        "empty": "Пока нет вопросов."
      },
      "staff": {
        "title": "Команда TMG",
        "subtitle": "Администраторы и модераторы приватного сервера и Discord-сообщества.",
        "private_server": "Стафф Приватки",
        "discord_moderation": "Модераторы Discord",
        "loading": "Загрузка списка...",
        "empty": "Нет участников в этой категории."
      },
      "news": {
        "title": "Новости сервера",
        "subtitle": "Последние обновления, ивенты и анонсы TMG DPS.",
        "loading": "Загрузка новостей...",
        "empty": "Пока нет новостей."
      }
    }
  },
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "downloads": "Downloads",
        "news": "News",
        "faq": "FAQ",
        "staff": "Staff"
      },
      "footer": {
        "rights": "All rights reserved.",
        "admin": "Admin Panel"
      },
      "hero": {
        "title": "TMGDPS",
        "subtitle": "The best private Geometry Dash server with custom features",
        "play_now": "Play Now"
      },
      "list": {
        "title_1": "TMG",
        "title_2": "LIST",
        "subtitle": "The official ranking of the hardest server levels. Explore the top demons, track the stats of the best players, and submit your own records to climb the leaderboard!",
        "open_list": "Open List",
        "submit_record": "Submit Record"
      },
      "stats": {
        "accounts": "Accounts",
        "levels": "Levels",
        "rates": "Rated Levels",
        "songs": "Songs"
      },
      "downloads": {
        "title": "Downloads",
        "subtitle": "Download the latest versions of the TMG DPS client for your device. Private server version: ",
        "version": "V. 2.2081",
        "desc_android": "Main client version for Android devices.",
        "desc_windows": "Main client version for PC (Windows).",
        "desc_windows_geode": "Patched gdps, works with geode on windows XP x64+.",
        "desc_android_geode_180": "Client version with mods support (Geode).",
        "desc_android_geode_161": "Old client version with mods support.",
        "desc_vs": "Helps fix errors 0xc0150002, msvcr100.dll, msvcr120.dll, vcruntime140.dll.",
        "btn_gdrive": "Download from Google Drive",
        "btn_alternative": "Alternative (BuilderCDN)",
        "btn_archive": "Download archive (.zip)",
        "btn_apk": "Download .apk",
        "btn_pack": "Download pack",
        "useful_resources": "Useful Resources",
        "link_switcher": "GDPS Switcher",
        "link_panel": "User Panel (Music / Activation)",
        "attention": "Attention:",
        "attention_text": "Extensions are available for users of older OS: One Core Api (for Windows XP), Second System (for Vista), VxKex (for Windows 7)."
      },
      "faq": {
        "title": "Frequently Asked Questions",
        "subtitle": "Answers to the most popular questions about the TMG DPS server.",
        "loading": "Loading questions...",
        "empty": "No questions yet."
      },
      "staff": {
        "title": "TMG Staff",
        "subtitle": "Administrators and moderators of the private server and Discord community.",
        "private_server": "Private Server Staff",
        "discord_moderation": "Discord Moderators",
        "loading": "Loading list...",
        "empty": "No members in this category."
      },
      "news": {
        "title": "Server News",
        "subtitle": "Latest updates, events and announcements for TMG DPS.",
        "loading": "Loading news...",
        "empty": "No news yet."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
