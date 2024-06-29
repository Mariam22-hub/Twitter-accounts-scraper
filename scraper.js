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
        // Replace newlines with spaces and trim whitespace
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

        // Scroll until the page height stops increasing
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

        // Intercept requests to block images, stylesheets, and fonts for faster loading
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

         // Navigate to the Twitter account page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for the content to load
        await page.waitForSelector('article', { timeout: 60000 });

        // Scroll down and extract tweets
        await scrollToBottomByMaxHeight(page);

        // Extract the tweets
        const tweets = await page.evaluate(extractTweets);

        // Count the occurrences of the ticker symbol in the tweets
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