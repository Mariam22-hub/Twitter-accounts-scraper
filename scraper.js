const puppeteer = require('puppeteer');
const schedule = require('node-schedule');
const fs = require('fs');

// List of Twitter accounts to scrape
const twitterAccounts = [
    'CordovaTrades',
    'Mr_Derivatives',
    'warrior_0719',
    'ChartingProdigy',
    'allstarcharts',
    'yuriymatso',
    'TriggerTrades',
    'AdamMancini4',
    'Barchart',
    'RoyLMattox'
];

// Function to extract tweets from the page
function extractTweets() {
    const extractedElements = document.querySelectorAll('article div[lang]');
    const items = [];
    for (let element of extractedElements) {
        const text = element.innerText.replace(/\n/g, ' ').trim();
        if (text) {
            items.push(text);
        }
    }
    return items;
}

// Custom delay function
function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

// Function to scroll to the bottom of the page
async function scrollToBottomByMaxHeight(page) {
    try {
        let previousHeight = 0;
        let currentHeight = await page.evaluate(() => document.scrollingElement.scrollHeight);

        while (previousHeight < currentHeight) {

            previousHeight = currentHeight;
            await page.evaluate('window.scrollTo(0, document.scrollingElement.scrollHeight)');
            await delay(3000); // wait for 3 seconds for new content to load
            currentHeight = await page.evaluate(() => document.scrollingElement.scrollHeight);
        }

        return await page.evaluate(() => document.querySelectorAll('article').length);
    } catch (err) {
        console.error('Error during scrolling:', err);
        return 0;
    }
}

async function scrapeTwitterAccount(account, ticker, browser) {
    const url = `https://twitter.com/${account}`;
    console.log("Scraping Twitter account: ", url);
    let count = 0;
    let page;

    try {
        page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for the content to load
        await page.waitForSelector('article', { timeout: 60000 });

        // Scroll and extract tweets
        await scrollToBottomByMaxHeight(page);
        const tweets = await page.evaluate(extractTweets);

        console.log("Fetched tweets:", tweets); // Debug log to check the tweets fetched

        for (const tweet of tweets) {
            if (tweet.includes(ticker)) {
                count++;
            }
        }

        await page.close(); // Close the page after processing
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
    }
    return count;
}

async function scrapeAllAccounts(ticker, interval) {
    console.log(`Scraping for ticker "${ticker}" every ${interval} minutes...`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate'
        ]
    });

    schedule.scheduleJob(`*/${interval} * * * *`, async () => {
        let totalCount = 0;

        for (const account of twitterAccounts) {
            const count = await scrapeTwitterAccount(account, ticker, browser);
            totalCount += count;
        }

        console.log(`"${ticker}" was mentioned "${totalCount}" times in the last "${interval}" minutes.`);
    });

    // Browser remains open for the duration of the script's execution
}

// Input Parameters
const ticker = process.argv[2]; // Stock symbol to look for
const interval = process.argv[3]; // Time interval in minutes

console.log('Ticker:', ticker); // Debug log
console.log('Interval:', interval); // Debug log

if (!ticker || !interval) {
    console.error('Please provide the stock ticker symbol and time interval as arguments.');
    process.exit(1);
}

// Start the scraper
scrapeAllAccounts(ticker, interval);



// const puppeteer = require('puppeteer');
// const schedule = require('node-schedule');
// const fs = require('fs');

// // List of Twitter accounts to scrape
// const twitterAccounts = [
//     'CordovaTrades',
//     'Mr_Derivatives',
//     'warrior_0719',
//     'ChartingProdigy',
//     'allstarcharts',
//     'yuriymatso',
//     'TriggerTrades',
//     'AdamMancini4',
//     'Barchart',
//     'RoyLMattox'
// ];

// function extractTweets() {
//     const extractedElements = document.querySelectorAll('article div[lang]');
//     const items = [];
//     for (let element of extractedElements) {
//         const text = element.innerText.replace(/\n/g, ' ').trim();
//         if (text) {
//             console.log("text: ", text)
//             items.push(text)
//         }
//     }
//     return items;
// }

// // delay function
// function delay(time) {
//     return new Promise(function(resolve) { 
//         setTimeout(resolve, time);
//     });
// }

// // Function to scrape tweets with infinite scrolling
// async function scrapeTweets(page, extractTweets, scrollDelay = 2000, maxRetries = 5) {
//     let items = [];
//     try {
//         let previousHeight;
//         let retries = 0;
//         while (true) {
//             const newItems = await page.evaluate(extractTweets);
//             items = items.concat(newItems);
//             items = [...new Set(items)]; // Remove duplicates

//             previousHeight = await page.evaluate('document.body.scrollHeight');
//             await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
//             await delay(scrollDelay);
            
//             const currentHeight = await page.evaluate('document.body.scrollHeight');
            
//             if (currentHeight === previousHeight) {
//                 retries++;
//                 if (retries >= maxRetries) {
//                     break; // Break if no more tweets are loaded after max retries
//                 }
//             } else {
//                 retries = 0; // Reset retries if new tweets are loaded
//             }
//         }
//     } catch (e) {
//         console.error('Error during scrolling:', e);
//     }
//     return items;
// }

// async function scrapeTwitterAccount(account, ticker, browser) {
//     const url = `https://twitter.com/${account}`;
//     console.log("Scraping Twitter account: ", url);
//     let count = 0;
//     let page;

//     try {
//         page = await browser.newPage();

//         await page.setRequestInterception(true);
//         page.on('request', (req) => {
//             if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
//                 req.abort();
//             } else {
//                 req.continue();
//             }
//         });

//         await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

//         // Wait for the content to load
//         await page.waitForSelector('article', { timeout: 60000 });

//         // Scroll and extract tweets
//         const tweets = await scrapeTweets(page, extractTweets);

//         console.log("Fetched tweets:", tweets); // Debug log to check the tweets fetched

//         // Regular expression to match the stock ticker
//         const tickerRegex = new RegExp(`\\$${ticker}(\\s|\\b)`, 'i');
//         for (const tweet of tweets) {
//             if (tweet.toLowerCase().includes(ticker.toLowerCase())) {
//                 count++;
//             }
//         }

//         await page.close(); // Close the page after processing
//     } catch (error) {
//         console.error(`Error fetching data from ${url}:`, error.message);
//     }
//     return count;
// }

// async function scrapeAllAccounts(ticker, interval) {
//     console.log(`Scraping for ticker "${ticker}" every ${interval} minutes...`);

//     const browser = await puppeteer.launch({
//         headless: true,
//         args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-accelerated-2d-canvas',
//             '--disable-gpu',
//             '--no-first-run',
//             '--no-zygote',
//             '--single-process',
//             '--disable-background-networking',
//             '--disable-default-apps',
//             '--disable-extensions',
//             '--disable-sync',
//             '--disable-translate'
//         ]
//     });

//     schedule.scheduleJob(`*/${interval} * * * *`, async () => {
//         let totalCount = 0;

//         for (const account of twitterAccounts) {
//             const count = await scrapeTwitterAccount(account, ticker, browser);
//             totalCount += count;
//         }

//         console.log(`"${ticker}" was mentioned "${totalCount}" times in the last "${interval}" minutes.`);

//     });

//     // Browser remains open for the duration of the script's execution
// }

// // Input Parameters
// const ticker = process.argv[2]; // Stock symbol to look for
// const interval = process.argv[3]; // Time interval in minutes

// console.log('Ticker:', ticker); // Debug log
// console.log('Interval:', interval); // Debug log

// if (!ticker || !interval) {
//     console.error('Please provide the stock ticker symbol and time interval as arguments.');
//     process.exit(1);
// }

// // Start the scraper
// scrapeAllAccounts(ticker, interval);