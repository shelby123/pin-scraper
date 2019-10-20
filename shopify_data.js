const axios = require('axios');
const cheerio = require('cheerio');
const models = require('./models');
const ShopifyPins = models.ShopifyPins;
const ItemOption = models.ItemOption;
const fetch = require('node-fetch');

const CLASS = "Shopify_Data: "
const CURRENCY_CONVERSION_URL = "https://api.exchangeratesapi.io/latest?base=USD;symbols=";

async function convertCurrency(shopifyData, originalCurrency) {
    let currencyCode = originalCurrency.toUpperCase();
    shopifyData.originalCurrency = currencyCode
    let rates = await fetch(CURRENCY_CONVERSION_URL + currencyCode)
        .then(response => response.json())
        .then(body => {
            console.log(body);
            return body.rates;
        });
    let rate = rates[currencyCode];
    shopifyData.itemOptions.forEach(option => {
            option.price = option.price / rate;
    });
    return shopifyData;

}
// async function convertCurrency(shopifyData, currencies) {
//     let currencyCodes = "";
//     shopifyData.forEach(item => {
//         item.originalCurrency = currencies[item.url];
//         currencyCodes = currencyCodes + item.originalCurrency.toUpperCase() + ","
//     });
//     currencyCodes = currencyCodes.slice(0, currencyCodes.length - 1);
//     let rates = await fetch(CURRENCY_CONVERSION_URL + currencyCodes)
//         .then(response => response.json())
//         .then(body => {
//             console.log(body);
//             return body.rates;
//         });
//     shopifyData.forEach(item => {
//         let rate = rates[item.originalCurrency.toUpperCase()];
//         item.itemOptions.forEach(option => {
//             option.price = option.price / rate;
//         })
//     })
//     return shopifyData;

// }

async function getOriginalCurrency(url) {
    let html = await axios.get(url);
    const $ = cheerio.load(html.data);
    let currency = $('meta[property="og:price:currency"]').attr('content');
    return currency;
}
async function scrapeDataFromUrl(url) {
    const METHOD_TAG = 'Shopify.scrapeDataFromUrl';
    const jsonUrl = url + ".json";
    let html = await axios.get(jsonUrl);
    let product = html.data.product;
    let currency = 'usd';
    let shopifyPin = new ShopifyPins(
        product.title,
        product.image.src,
        url,
        product.vendor,
        currency
    );
    product.variants.forEach(item => {
        shopifyPin.addOptions(new ItemOption(item.title, item.price, 0));
    });
    return shopifyPin;
}

function cleanseUrl(url) {
    return url.split('?')[0];
}

async function generateShopifyData(url) {
    const METHOD_TAG = 'Shopify.generateShopifyData';
    console.log(METHOD_TAG + "Generating data for url" + url);
    let shopifyPin;
    let returnObj = {};
    returnObj.url = url;
    let urlParsed = cleanseUrl(url);
    try {
        let [originalCurrency, pinData] = 
            await Promise.all([getOriginalCurrency(urlParsed), scrapeDataFromUrl(urlParsed)]);
        let shopifyPin = await convertCurrency(pinData, originalCurrency);
        returnObj.success = true;
        returnObj.data = shopifyPin;
    } catch (error) { // axios error
        returnObj.success = false;
        console.error(METHOD_TAG + ": Error generating data for URL " + url);
        console.error(METHOD_TAG + ": Error is" + String(error));
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            returnObj.error = "Bad response from url: " + error.response.data + " : " + error.response.status;
        } else if (error.request) {
            returnObj.error = "No response recieved from url" + error;
        } else {
            returnObj.error = "Other error occured while processing: " + error;
        }
    }
    return returnObj;
}


// async function generateShopifyData(urls) {
//     console.log(CLASS + "generate data for " + urls.length + " urls:");
//     console.log(urls);
//     let promises = [];
//     let shopifyData = [];
//     let currencies = [];
//     urls.forEach(function (url) {
//         const jsonUrl = url + ".json";
//         let currency = "usd";
//         let shopifyPin;
//         let currencyPromise = axios.get(url)
//             .then((response) => {
//                 const $ = cheerio.load(response.data);
//                 currency = $('meta[property="og:price:currency"]').attr('content');
//                 currencies[url] = currency;
//                 return currency;
//             })
//         let pinPromise = axios.get(jsonUrl)
//             .then((response) => {
//                 let product = response.data.product;
//                 shopifyPin = new ShopifyPins(
//                     product.title,
//                     product.image.src,
//                     url,
//                     product.vendor,
//                     currency
//                 );

//                 product.variants.forEach(item => {
//                     let originalPrice = item.price;

//                     shopifyPin.addOptions(new ItemOption(item.title, item.price, 0));
//                 });
//                 shopifyData.push(shopifyPin);
//             });
//         promises.push(currencyPromise);
//         promises.push(pinPromise);


//     })

//     let results = await Promise.all(promises);
//     await convertCurrency(shopifyData, currencies);
//     return shopifyData;
// }



module.exports = {
    generateShopifyData: generateShopifyData
}
