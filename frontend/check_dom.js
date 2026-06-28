import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    
    console.log('Logging in...');
    await page.type('input[type="email"]', 'thuyb@gmail.com');
    await page.type('input[type="password"]', 'User123!');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for navigation to groups...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.goto('http://localhost:5173/groups', { waitUntil: 'networkidle2' });
    
    console.log('Opening Create Group Modal...');
    // Find button containing "Tạo nhóm học" or similar and click it
    const buttons = await page.$$('button');
    let createBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Tạo nhóm') || text.includes('Tạo Nhóm')) {
        createBtn = btn;
        break;
      }
    }
    
    if (!createBtn) {
      throw new Error('Create group button not found');
    }
    await createBtn.click();
    await page.waitForSelector('button');
    
    console.log('Clicking Học Offline card...');
    const step1Buttons = await page.$$('button');
    let offlineCard = null;
    for (const btn of step1Buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Học Offline')) {
        offlineCard = btn;
        break;
      }
    }
    
    if (!offlineCard) {
      throw new Error('Offline card button not found');
    }
    await offlineCard.click();
    
    // Wait for step 2 form to render
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Inspecting Step 2 DOM...');
    const domInfo = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent);
      const textareas = Array.from(document.querySelectorAll('textarea')).length;
      const inputs = Array.from(document.querySelectorAll('input')).map(i => i.placeholder);
      const buttonsText = Array.from(document.querySelectorAll('button')).map(b => b.textContent);
      return { labels, textareas, inputs, buttonsText };
    });
    
    console.log('DOM Info:', JSON.stringify(domInfo, null, 2));
    
  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    await browser.close();
  }
})();
