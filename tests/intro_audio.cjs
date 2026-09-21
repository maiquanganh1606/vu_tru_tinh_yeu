// Node.js + Playwright + Chrome; run against Flask or set LOVE_TEST_URL.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.LOVE_TEST_URL || 'http://127.0.0.1:5001/';

async function open(browser, options = {}, failAudio = false) {
    const page = await browser.newPage(options);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        document.addEventListener('intro:start', event => {
            window.testIntroStart = event.detail.startedAt;
            window.testIntroAudio = document.getElementById('intro-music');
        }, true);
    });
    if (failAudio) await page.route('**/intro_score.mp3', route => route.abort());
    await page.goto(url);
    await page.waitForSelector('#intro-sound-btn:not([hidden])');
    return { page, errors };
}

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true,
        args: ['--autoplay-policy=document-user-activation-required'] });
    try {
        for (const mobile of [false, true]) {
            const { page, errors } = await open(browser, {
                viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }
            });
            await page.waitForFunction(() => document.getElementById('intro-music').readyState >= 2);
            assert.equal(await page.locator('#intro-music').evaluate(audio => audio.paused), true);
            await page.waitForTimeout(1800);
            await page.locator('#intro-sound-btn').click();
            await page.waitForFunction(() => !window.testIntroAudio.paused && document.getElementById('intro-sound-btn').getAttribute('aria-pressed') === 'true');
            const lag = await page.evaluate(() => Math.abs(window.testIntroAudio.currentTime - (performance.now()-window.testIntroStart)/1000));
            assert.ok(lag < .5, `Late activation must follow flight clock, lag=${lag}`);
            assert.equal(await page.locator('#intro-sound-btn').getAttribute('aria-pressed'), 'true');
            await page.locator('#intro-sound-btn').click();
            assert.equal(await page.evaluate(() => window.testIntroAudio.paused), true);
            await page.waitForTimeout(500);
            await page.locator('#intro-sound-btn').click();
            await page.waitForFunction(() => !window.testIntroAudio.paused && document.getElementById('intro-sound-btn').getAttribute('aria-pressed') === 'true');
            if (!mobile) await page.locator('#intro-skip-btn').click();
            await page.waitForFunction(() => !document.getElementById('intro-overlay'), null, { timeout: 32000 });
            assert.equal(await page.evaluate(() => window.testIntroAudio.paused && !window.testIntroAudio.hasAttribute('src')), true);
            assert.equal(await page.locator('#bg-music').evaluate(audio => audio.paused), true);
            assert.deepEqual(errors, []);
            console.log(`PASS audio ${mobile ? 'mobile, natural ending' : 'desktop, skip'}: autoplay blocked, late sync, mute/resume, cleanup`);
            await page.close();
        }
        const { page, errors } = await open(browser, {}, true);
        await page.locator('#intro-sound-btn').click();
        await page.waitForFunction(() => document.getElementById('intro-sound-btn').textContent.includes('Thử lại'));
        await page.locator('#intro-skip-btn').click();
        await page.waitForFunction(() => !document.getElementById('intro-overlay'));
        assert.deepEqual(errors, []);
        console.log('PASS missing audio: recoverable control and working skip');
    } finally {
        await browser.close();
    }
    const allowed = await chromium.launch({ channel: 'chrome', headless: true,
        args: ['--autoplay-policy=no-user-gesture-required'] });
    try {
        const { page, errors } = await open(allowed, { reducedMotion: 'reduce' });
        await page.waitForFunction(() => !window.testIntroAudio.paused && window.testIntroAudio.currentTime > .1);
        await page.waitForFunction(() => !document.getElementById('intro-overlay'), null, { timeout: 12000 });
        assert.equal(await page.evaluate(() => window.testIntroAudio.paused && !window.testIntroAudio.hasAttribute('src')), true);
        assert.deepEqual(errors, []);
        console.log('PASS permitted autoplay and reduced-motion ending');
    } finally {
        await allowed.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
