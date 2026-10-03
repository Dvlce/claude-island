import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

OUT=Path(__file__).resolve().parent/'artifacts'
OUT.mkdir(exist_ok=True)

async def run():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-webgl','--enable-unsafe-swiftshader'])
        page=await browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        external=[]
        page.on('request',lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1:5179/','blob:','data:')) else None)
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
        assert mature['rendererCalls']<100, 'Mature world draw budget regressed'
        assert not external, f'Offline game requested external assets: {external}'
        await page.locator('#quality').select_option('fluid')
        assert await page.evaluate('window.islandDebug().quality')=='fluid'
        await page.locator('[data-speed="5"]').click()
        for action in ['nerd','wizard','skate','swim']:
            await page.locator('#moment').select_option(action)
            await page.locator('#try-moment').click()
            await page.wait_for_function('(a)=>window.islandDebug().moment===a',arg=action,timeout=45000)
            await page.screenshot(path=str(OUT/f'{action}.png'))
            if action=='swim':
                await page.wait_for_timeout(1300)
                assert await page.evaluate('window.islandDebug().position[1]')<.5
            await page.wait_for_function('window.islandDebug().moment===null',timeout=30000)
            assert abs((await page.evaluate('window.islandDebug().position[1]'))-.72)<.01
        # Commission land, then a building, and verify transactions survive reload.
        await page.locator('[data-speed="20"]').click()
        landBefore=await page.evaluate('window.islandDebug().construction.expansions')
        await page.locator('#expand-island').click()
        await page.wait_for_function('(n)=>window.islandDebug().construction.expansions>n',arg=landBefore,timeout=45000)
        builtBefore=await page.evaluate('window.islandDebug().construction.built.length')
        await page.locator('#construct').click()
        await page.wait_for_function('window.islandDebug().moment==="build"',timeout=45000)
        await page.screenshot(path=str(OUT/'construction.png'))
        await page.wait_for_function('(n)=>window.islandDebug().construction.built.length>n',arg=builtBefore,timeout=30000)
        await page.locator('#manual').click() # suspend autonomous builds during persistence check
        await page.wait_for_timeout(5200)
        builtSaved=await page.evaluate('window.islandDebug().construction')
        await page.reload(wait_until='networkidle')
        await page.wait_for_function('window.islandReady===true')
        assert await page.evaluate('window.islandDebug().construction.built')==builtSaved['built']
        assert await page.evaluate('window.islandDebug().construction.expansions')==builtSaved['expansions']
        await page.screenshot(path=str(OUT/'built-village.png'))
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
        assert not external, external
        print(json.dumps({'initial':initial,'progressed':progressed,'restored':restored,'mature':mature,'manual_before':before,'manual_after':after,'errors':errors},indent=2))
        await browser.close()

asyncio.run(run())
