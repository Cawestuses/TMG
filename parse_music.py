import asyncio
import os
import re
import sys
import json
from dotenv import load_dotenv
from playwright.async_api import async_playwright

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

load_dotenv()

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")


def save_song_count(count: int):
    data = {
        "news": [],
        "staff": [],
        "faq": [],
        "songs": 0,
    }

    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            pass

    data["songs"] = count

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[*] Saved song count to {DATA_FILE}: {count}")

BASE_URL = os.getenv("GDPS_BASE_URL", "").rstrip('/')
USERNAME = os.getenv("GDPS_USERNAME")
PASSWORD = os.getenv("GDPS_PASSWORD")

SONGS_PER_PAGE = 20


async def main():
    if not all([BASE_URL, USERNAME, PASSWORD]):
        print("[!] Ошибка: Не все переменные окружения (.env) загружены!")
        return

    login_url = f"{BASE_URL}/login"
    target_url = f"{BASE_URL}/music/list"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            print(f"[*] Переход на страницу авторизации: {login_url}")
            await page.goto(login_url, wait_until="networkidle")

            username_input = page.locator('input[type="text"], input[type="email"], input[placeholder*="Логин" i], input[placeholder*="username" i]').first
            await username_input.wait_for(state="visible", timeout=10000)
            await username_input.fill(USERNAME)

            password_input = page.locator('input[type="password"]').first
            await password_input.fill(PASSWORD)

            submit_button = page.locator('button:has-text("Войти"), button:has-text("Вход"), button[type="submit"]').first
            await submit_button.click()

            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            print(f"[*] Переходим к списку музыки: {target_url}")
            await page.goto(target_url, wait_until="networkidle")

            pagination_locator = page.locator('span', has_text=re.compile(r"Страница\s+\d+\s+из", re.I)).first
            await pagination_locator.wait_for(state="visible", timeout=15000)

            text = await pagination_locator.text_content()
            text = text.strip()

            numbers = re.findall(r'\d+', text)
            if len(numbers) >= 2:
                total_pages = int(numbers[1])
                print(f"[*] Всего страниц (N): {total_pages}")

                last_page_url = f"{target_url}?page={total_pages}"
                print(f"[*] Переходим на последнюю страницу: {last_page_url}")
                await page.goto(last_page_url, wait_until="networkidle")
                await pagination_locator.wait_for(state="visible", timeout=10000)

                song_items = page.locator('tbody tr')
                
                if await song_items.count() == 0:
                    song_items = page.locator('.grid > div, .flex-col > .items-center')

                last_page_songs_count = await song_items.count()
                print(f"[*] Песен на последней странице: {last_page_songs_count}")

                if total_pages == 1:
                    total_songs = last_page_songs_count
                else:
                    total_songs = ((total_pages - 1) * SONGS_PER_PAGE) + last_page_songs_count

                print("=" * 40)
                print(f"[УСПЕХ] Общее количество песен на сервере: {total_songs}")
                print("=" * 40)

            else:
                print("[!] Не удалось извлечь количество страниц.")

        except Exception as e:
            print(f"[!] Ошибка во время выполнения: {e}")

        finally:
            # Сохранить найденное значение total_songs (если определено) в data.json
            try:
                total = locals().get('total_songs') or locals().get('total') or 0
                save_song_count(int(total))
            except Exception as e:
                print(f"[!] Не удалось сохранить количество песен: {e}")
            try:
                await browser.close()
            except Exception:
                pass


if __name__ == "__main__":
    asyncio.run(main())