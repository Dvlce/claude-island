import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

OUT=Path('/Users/dvlce/claude-island/artifacts')
OUT.mkdir(exist_ok=True)

async def run():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader'])
        page=await browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        await page.goto('http://127.0.0.1:5179/',wait_until='networkidle')
        await page.wait_for_function('window.islandReady === true',timeout=30000)
        await page.wait_for_timeout(2500)
        initial=await page.evaluate('window.islandDebug()')
        await page.screenshot(path=str(OUT/'desktop.png'))
        await page.locator('#models').click()
        assert await page.locator('.model-card').count()==32
        await page.locator('[data-filter="2023"]').click()
        assert await page.locator('.model-card').count()==6
        await page.locator('[data-filter="2026"]').click()
        assert await page.locator('.model-card').count()==13
        await page.locator('[data-dialog-close="archive"]').click()
        await page.locator('#manual').click()
        before=await page.evaluate('window.islandDebug().position')
        await page.keyboard.down('d')
        await page.wait_for_timeout(1500)
        await page.keyboard.up('d')
        after=await page.evaluate('window.islandDebug().position')
        assert before!=after, 'Manual movement did not move Claude'
        await page.keyboard.press('Escape')
        assert not await page.evaluate('window.islandDebug().manual')
        await page.locator('[data-weather="rain"]').click()
        await page.wait_for_timeout(500)
        assert await page.evaluate('window.islandDebug().weather')=='rain'
        await page.locator('[data-weather="sun"]').click()
        await page.locator('#pause').click()
        pausedXP=await page.evaluate('window.islandDebug().xp')
        await page.wait_for_timeout(900)
        assert abs((await page.evaluate('window.islandDebug().xp'))-pausedXP)<.01
        await page.locator('#pause').click()
        await page.locator('[data-speed="20"]').click()
        await page.wait_for_timeout(12000)
        progressed=await page.evaluate('window.islandDebug()')
        assert progressed['xp']>initial['xp']+200
        await page.wait_for_timeout(1500)
        await page.reload(wait_until='networkidle')
        await page.wait_for_function('window.islandReady === true')
        restored=await page.evaluate('window.islandDebug()')
        assert restored['xp']>=progressed['xp'], 'Saved progress was lost'
        await page.screenshot(path=str(OUT/'progressed.png'))
        # Exercise a mature world from a valid persisted game state.
        await page.add_init_script('''const saved=JSON.parse(localStorage.getItem('claude-island-v1')||'{}');Object.assign(saved,{version:1,xp:100000,speed:1,seconds:1200,weather:'sun',selected:null,savedAt:Date.now()});localStorage.setItem('claude-island-v1',JSON.stringify(saved));''')
        await page.reload(wait_until='networkidle')
        await page.wait_for_function('window.islandReady === true')
        await page.wait_for_timeout(3500)
        mature=await page.evaluate('window.islandDebug()')
        print(json.dumps({'initial':initial,'mature':mature},indent=2),flush=True)
        assert mature['residents']==12 and mature['islandScale']>1.3
        assert mature['model']=='fable-5-1'
        await page.screenshot(path=str(OUT/'mature.png'))
        await page.locator('#models').click()
        await page.screenshot(path=str(OUT/'archive.png'))
        await page.locator('[data-dialog-close="archive"]').click()
        await page.set_viewport_size({'width':390,'height':844})
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUT/'mobile.png'))
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.locator('[data-panel="stats-panel"]').click()
        assert await page.locator('#stats-panel').is_visible()
        await page.screenshot(path=str(OUT/'mobile-stats.png'))
        await page.locator('[data-close="stats-panel"]').click()
        await page.locator('#manual').click()
        assert await page.locator('#dpad').is_visible()
        assert not errors, errors
        print(json.dumps({'initial':initial,'progressed':progressed,'restored':restored,'mature':mature,'manual_before':before,'manual_after':after,'errors':errors},indent=2))
        await browser.close()

asyncio.run(run())
