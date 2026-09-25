// Run with Node.js and Playwright available on NODE_PATH.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const fileURL = pathToFileURL(path.resolve(__dirname, '../templates/index.html')).href;
const urls = process.env.LOVE_TEST_URL ? [process.env.LOVE_TEST_URL] : [fileURL, 'http://127.0.0.1:5001/'];

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const url of urls) {
            for (const mobile of [false, true]) {
                const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
                // Verify controls also work when optional CDN assets are unavailable.
                await context.route(/^https:\/\//, route => route.abort());
                await context.route('**/three-r128.min.js', route => route.abort());
                const page = await context.newPage();
                const errors = [];
                page.on('pageerror', error => errors.push(error.message));
                for (const button of ['#intro-skip-btn', '#intro-enter-btn', '#intro-watch-btn']) {
                    await page.goto(url, { waitUntil: 'load' });
                    assert.equal(await page.locator('#intro-overlay').isVisible(), true);
                    if (button !== '#intro-skip-btn') {
                        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.intro-controls')).opacity) > 0.99);
                    }
                    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('intro-active')), true, 'Intro must still be active before click');
                    await page.locator(button).click();
                    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('intro-active')), false, `${button} must close intro immediately`);
                    await page.waitForFunction(() => getComputedStyle(document.getElementById('main-panel')).opacity === '1');
                    assert.equal(await page.locator('#main-panel').isVisible(), true);
                    await page.waitForFunction(() => !document.getElementById('intro-overlay'));
                }
                await page.getByRole('button', { name: 'Tất cả kỷ niệm' }).click();
                assert.equal(await page.locator('#gallery-overlay').isVisible(), true);
                assert.equal(await page.locator('.photo-card').count(), await page.evaluate(() => window.LOVE_IMAGES.length));
                await page.locator('.photo-card').first().click();
                await page.waitForFunction(() => {
                    const image = document.getElementById('lightbox-img');
                    return image.complete && image.naturalWidth > 0;
                });
                assert.equal(await page.locator('#lightbox').isVisible(), true);
                await page.locator('#lightbox').click({ position: { x: 5, y: 5 } });
                await page.waitForFunction(() => getComputedStyle(document.getElementById('lightbox')).display === 'none');
                await page.locator('#gallery-overlay .close-btn').click();
                await page.waitForFunction(() => getComputedStyle(document.getElementById('gallery-overlay')).display === 'none');
                await page.getByRole('button', { name: 'Hộp thư' }).click();
                await page.locator('.mail-item').first().click();
                assert.match(await page.locator('.mail-item').first().getAttribute('class'), /opened/);
                await page.locator('#mailbox-overlay .close-btn').click();
                await page.waitForFunction(() => getComputedStyle(document.getElementById('mailbox-overlay')).display === 'none');
                await page.locator('#music-btn').click();
                await page.waitForFunction(() => !document.getElementById('bg-music').paused && document.getElementById('bg-music').currentTime > 0);
                await page.locator('#music-btn').click();
                await page.waitForFunction(() => document.getElementById('bg-music').paused);
                await page.locator('.hide-ui-btn').click();
                assert.equal(await page.locator('#main-panel').evaluate(el => el.classList.contains('visible')), false);
                await page.locator('body').click({ position: { x: 10, y: 10 } });
                assert.equal(await page.locator('#main-panel').evaluate(el => el.classList.contains('visible')), true);
                assert.deepEqual(errors, [], 'No JavaScript runtime errors');
                console.log(`PASS ${url.startsWith('file:') ? 'file' : 'http'} ${mobile ? 'mobile' : 'desktop'}: 3 intro buttons, gallery + image, mailbox, music, hide/show panel; CDN unavailable`);
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
