"""
pip install playwright beautifulsoup4
playwright install chromium
python count_songs.py
"""

import asyncio
import json
import os
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

BASE_URL = "https://n01.forever-host.xyz/0004/panel"
USERNAME = "bot01"
PASSWORD = "gold31122009"
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


async def login(page):
    await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    await page.wait_for_selector('input[type="password"]', timeout=10000)
    await page.fill('input[type="text"], input[name*="user"], input[name*="login"]', USERNAME)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"], input[type="submit"]')
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(2000)
    print(f"[*] После логина: {page.url}")


async def count_songs_on_page(page) -> int:
    await page.wait_for_load_state("networkidle")
    await page.wait_for_timeout(1500)

    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")

    rows = soup.select("table tbody tr")
    if rows:
        return len(rows)

    for sel in ["[class*='song']", "[class*='track']", "[class*='music']", "[class*='item']"]:
        items = await page.query_selector_all(sel)
        if items:
            return len(items)

    return 0


async def get_next_button(page):
    """
    Ищет активную кнопку с иконкой chevron-right (lucide-chevron-right).
    Возвращает элемент или None если кнопка disabled / не найдена.
    """
    # Кнопка содержит SVG с классом lucide-chevron-right
    buttons = await page.query_selector_all("button:has(svg.lucide-chevron-right)")
    for btn in buttons:
        disabled = await btn.get_attribute("disabled")
        if disabled is None:
            return btn
    return None


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("=== Авторизация ===")
        await login(page)

        print("=== Список музыки ===")
        await page.goto(f"{BASE_URL}/music/list", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        total = 0
        page_num = 1

        while True:
            count = await count_songs_on_page(page)
            print(f"[*] Страница {page_num}: {count} песен")
            total += count

            btn = await get_next_button(page)
            if not btn:
                print("[*] Кнопка 'вперёд' отключена или не найдена — это последняя страница.")
                break

            await btn.click()
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(1500)
            page_num += 1

        print(f"\n✅ Итого песен: {total} (страниц: {page_num})")
        save_song_count(total)
        await browser.close()


asyncio.run(main())