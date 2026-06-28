import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    console.log('Logging in...');
    await page.type('input[type="email"]', 'thuyb@gmail.com');
    await page.type('input[type="password"]', 'User123!');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.goto('http://localhost:5173/groups', { waitUntil: 'networkidle2' });
    
    console.log('Opening Create Group Modal...');
    const buttons = await page.$$('button');
    let createBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Tạo nhóm') || text.includes('Tạo Nhóm')) {
        createBtn = btn;
        break;
      }
    }
    await createBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Clicking Học Online card...');
    const step1Buttons = await page.$$('button');
    let onlineCard = null;
    for (const btn of step1Buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Học Online')) {
        onlineCard = btn;
        break;
      }
    }
    await onlineCard.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Taking online screenshot...');
    await page.screenshot({ path: 'online_form.png' });
    
    console.log('Clicking back button...');
    const backBtn = await page.$('button[style*="fontSize: 20"]');
    if (backBtn) {
      await backBtn.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      // Find ← button
      const step2Buttons = await page.$$('button');
      for (const btn of step2Buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text === '←') {
          await btn.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        }
      }
    }
    
    console.log('Clicking Học Offline card...');
    const step1Buttons2 = await page.$$('button');
    let offlineCard = null;
    for (const btn of step1Buttons2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Học Offline')) {
        offlineCard = btn;
        break;
      }
    }
    await offlineCard.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Taking offline screenshot...');
    await page.screenshot({ path: 'offline_form.png' });
    
    console.log('Screenshots saved successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
