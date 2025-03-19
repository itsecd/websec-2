const puppeteer = require("puppeteer");

async function resetIndexedDB() {
  const browser = await puppeteer.launch({
    headless: true, 
  });
  const page = await browser.newPage();

  
  await page.goto("about:blank");

  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase("StationsDB");
      request.onsuccess = () => {
        console.log("База данных StationsDB успешно удалена");
        resolve();
      };
      request.onerror = (event) => {
        console.error("Ошибка при удалении базы данных:", event.target.error);
        reject(event.target.error);
      };
      request.onblocked = () => {
        console.warn("Удаление базы данных заблокировано, закройте все соединения");
        reject(new Error("Удаление заблокировано"));
      };
    });
  });

  await browser.close();
  console.log("Сброс завершен");
}

resetIndexedDB().catch((error) => {
  console.error("Ошибка в процессе сброса:", error);
  process.exit(1);
});