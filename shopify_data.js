const axios = require('axios');
const cheerio = require('cheerio');
const models = require('./models');
const ShopifyPins = models.ShopifyPins;
const ItemOption = models.ItemOption;
const fetch = require('node-fetch');


const CURRENCY_CONVERSION_URL = "https://api.exchangeratesapi.io/latest?base=USD;symbols=";

async function convertCurrency(shopifyData, currencies) {
    let currencyCodes = "";
    shopifyData.forEach(item => {
        item.originalCurrency = currencies[item.url];
        currencyCodes = currencyCodes + item.originalCurrency.toUpperCase() + ","
    });
    console.log(currencyCodes);
    currencyCodes = currencyCodes.slice(0, currencyCodes.length - 1);
    console.log(" currency codes ******** " + currencyCodes)
    let rates = await fetch(CURRENCY_CONVERSION_URL + currencyCodes)
        .then(response => response.json())
        .then(body => {
            console.log(body);
            return body.rates;
        });
    shopifyData.forEach(item => {
        let rate = rates[item.originalCurrency.toUpperCase()];
        console.log("rate for item " + item.name + " : " + rate);
        item.itemOptions.forEach(option => {
            option.price = option.price / rate;
        })
    })
    return shopifyData;

}

async function generateShopifyData(urls) {
    let promises = [];
    let shopifyData = [];
    let currencies = [];
    urls.forEach(function(url) {
        const jsonUrl = url + ".json";
        let currency = "usd";
        let shopifyPin;
        let currencyPromise = axios.get(url)
            .then((response) => {
                const $ = cheerio.load(response.data);
                currency = $('meta[property="og:price:currency"]').attr('content');
                currencies[url] = currency;
                return currency;
            })
        let pinPromise = axios.get(jsonUrl)
            .then((response) => {
                let product = response.data.product;
                shopifyPin = new ShopifyPins(
                    product.title,
                    product.image.src,
                    url,
                    product.vendor,
                    currency
                );

                product.variants.forEach(item => {
                    let originalPrice = item.price;

                    shopifyPin.addOptions(new ItemOption(item.title, item.price, 0));
                });
                shopifyData.push(shopifyPin);
            });
        promises.push(currencyPromise);
        promises.push(pinPromise);


    })

    let results = await Promise.all(promises);
    console.log(results);
    await convertCurrency(shopifyData, currencies);
    return shopifyData;
}



module.exports = {
    generateShopifyData: generateShopifyData
}
