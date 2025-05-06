// hit(request) google businesses link
// get the link for each business
//// get the email
// save output to file

const puppeteer = require("puppeteer");

const setupBrowser = async () => {
  const viewportHeight = 1024;
  const viewportWidth = 1080;
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.setViewport({ width: viewportWidth, height: viewportHeight });

  return [browser, page];
};

async function run() {
  const [browser, page] = await setupBrowser();

  await page.goto(
    "https://www.google.com/search?sca_esv=e95a676e342dd0a3&tbm=lcl&sxsrf=AHTn8zp8q0byutra5CI4VHcQUglDW8-40A:1746511227050&q=civil+engineering+companies+near+me&rflfq=1&num=10&sa=X&ved=2ahUKEwiImqOqlY6NAxVxQEEAHa-BCvIQjGp6BAgiEAE&biw=1700&bih=855&dpr=1.09#rlfi=hd:;si:9517394829108428102,l,CiNjaXZpbCBlbmdpbmVlcmluZyBjb21wYW5pZXMgbmVhciBtZSIDkAEBSLbT2dGVuoCACFotEAAQARACGAEiI2NpdmlsIGVuZ2luZWVyaW5nIGNvbXBhbmllcyBuZWFyIG1lkgETc3RydWN0dXJhbF9lbmdpbmVlcpoBJENoZERTVWhOTUc5blMwVkpRMEZuU1VSR2FITlRaM3BSUlJBQqoBbRABKh8iG2NpdmlsIGVuZ2luZWVyaW5nIGNvbXBhbmllcygAMh8QASIbReBZXwL3yU7oLakEUJ6O6Cdrx5cigX_1DzO9MicQAiIjY2l2aWwgZW5naW5lZXJpbmcgY29tcGFuaWVzIG5lYXIgbWX6AQQIABA9;mv:[[51.5974315,0.43128059999999996],[51.2783186,-0.12856779999999998]]"
  );

  await page.waitForSelector("span.UywwFc-RLmnJb");
  await page.click("span.UywwFc-RLmnJb");

  await page.waitForSelector("a.yYlJEf.Q7PwXb.L48Cpd.brKmxb");

  //   const businessUrls = await page.$$("a.yYlJEf.Q7PwXb.L48Cpd.brKmxb");
  const urlCorpus = await page.evaluate((e) => {
    return Array.from(
      document.querySelectorAll("a.yYlJEf.Q7PwXb.L48Cpd.brKmxb")
    ).map((value) => value.href);
  });
  console.log("urls", urlCorpus);

  //   {
  //     url: "",
  //     email: "",
  //   }

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

      console.log(emails);
    } catch (err) {
      console.error(`Error processing ${url}`, err.message);
    }
  }
}

run();
