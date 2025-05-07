const puppeteer = require("puppeteer");
const fs = require("fs");
const { google } = require("googleapis");
require("dotenv").config();

//google sheets credentials
const credentials = require("./percy/company-scraper-serviced-account.json");

//google sheets setup
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

async function appendToSheet(data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "BIRDSX", //tabname
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: data,
    },
  });
}

const sleep = (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
};

const setupBrowser = async () => {
  const viewportHeight = 1024;
  const viewportWidth = 1080;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.setViewport({ width: viewportWidth, height: viewportHeight });

  return [browser, page];
};

emailData = [];

const URL =
  "https://www.google.com/search?q=civil+engineering+companies+in+birmingham&sca_esv=e4a529db535589d2&biw=1700&bih=855&tbm=lcl&sxsrf=AHTn8zqiqRHiHz8OUeXnTRoZHTs2Qa0D5w%3A1746586998140&ei=ds0aaIGpCN2AhbIP4KSD0Ak&oq=civil+engineering+companies+in+&gs_lp=Eg1nd3Mtd2l6LWxvY2FsIh9jaXZpbCBlbmdpbmVlcmluZyBjb21wYW5pZXMgaW4gKgIIAzIEECMYJzILEAAYgAQYkQIYigUyCxAAGIAEGJECGIoFMgsQABiABBiRAhiKBTILEAAYgAQYkQIYigUyBRAAGIAEMgUQABiABDIFEAAYgAQyBRAAGIAEMgUQABiABEi1YVCnBlinBnAAeACQAQCYAVWgAcoBqgEBM7gBAcgBAPgBAZgCA6ACiQLCAgsQABiABBiGAxiKBcICCBAAGIAEGKIEwgIGEAAYFhgemAMAiAYBkgcDMi4xoAe_ErIHAzIuMbgHiQI&sclient=gws-wiz-local#rlfi=hd:;si:;mv:[[52.5587098,-1.8308978000000002],[52.408877499999996,-1.9729356999999998]];tbs:lrf:!1m4!1u3!2m2!3m1!1e1!1m4!1u2!2m2!2m1!1e1!2m1!1e2!2m1!1e3!3sIAE,lf:1,lf_ui:2";

async function getBusinessDataFromPage(page) {
  await page.goto(URL);

  await page.waitForSelector("span.UywwFc-RLmnJb");
  await page.click("span.UywwFc-RLmnJb");

  let urlCorpus = [];
  let nextPagePresent = true;
  let pageIndex = 1;
  while (nextPagePresent) {
    console.log("getting company urls from page: ", pageIndex);
    await sleep(2000);

    await page.waitForSelector("a.yYlJEf.Q7PwXb.L48Cpd.brKmxb");

    const urls = await page.evaluate((e) => {
      return Array.from(
        document.querySelectorAll("a.yYlJEf.Q7PwXb.L48Cpd.brKmxb")
      ).map((value) => value.href);
    });

    urlCorpus = urlCorpus.concat(urls);

    //check next page exists
    const nextPageLink = await page.$("#pnnext > span.oeN89d");

    if (nextPageLink) {
      nextPagePresent = true;

      //click next page button
      await nextPageLink.click();
      console.log("clicked to next page");

      await page.waitForNavigation();

      pageIndex++;
      await sleep(2000);
    } else {
      nextPagePresent = false;
    }

    console.log(urlCorpus);
  }

  console.log("urlCorpus: ", urlCorpus);

  //check for next page
  console.log("getting emails");

  for (let url of urlCorpus) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      //   await page.waitForTimeout(3000);

      const mailtos = await page.$$eval('a[href^="mailto:"]', (as) =>
        as.map((a) => a.href.replace(/^mailto:/, "").split("?")[0])
      );

      const visibleText = await page.evaluate(() => document.body.innerText);
      const html = await page.content();

      function extractEmails(str) {
        if (!str) return [];
        const matches = str.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        );

        return matches ? Array.from(new Set(matches)) : [];
      }

      const emailsFromText = extractEmails(visibleText);
      const emailsFromHTML = extractEmails(html);

      const emails = Array.from(
        new Set([...mailtos, ...emailsFromText, ...emailsFromHTML])
      );

      emailData.push({ url, emails });
      await sleep(2000);

      //go to next page
      console.log("emailData: ", emailData);
    } catch (err) {
      console.error(`Error processing ${url}`, err.message);
    }
  }

  return emailData;
}

async function run() {
  const [browser, page] = await setupBrowser();

  //   let lastPageReached = false;
  //   let pageIndex = 1;

  //   while (!lastPageReached) {
  //     const nextPageLink = await page.$("#pnnext > span.oeN89d");

  //     let allEmailData = [];

  //     if (!nextPageLink) {
  //       console.log("No more pages left :)");
  //       lastPageReached = true;
  //     } else {
  //       const emailData = await getBusinessDataFromPage(page, pageIndex);

  //       allEmailData = allEmailData.concat(emailData);
  //       //click next page button
  //       await nextPageLink.click();

  //       await page.waitForNavigation();

  //       pageIndex++;
  //     }

  //     return allEmailData;
  //   }

  const allEmailData = await getBusinessDataFromPage(page);
  console.log("final email data: ", allEmailData);

  // fs.writeFileSync(
  //   "scraped-company-data.json",
  //   JSON.stringify(allEmailData),
  //   "utf-8"
  // );

  //extracting to google sheets
  const rows = allEmailData.map((entry) => [entry.url, entry.emails.join(",")]);
  await appendToSheet(rows);

  console.log("data submitted to google sheets :)");
  await browser.close();
}

run();
