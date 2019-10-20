const fetch = require('node-fetch');
const models = require('./models');
const EtsyPins = models.EtsyPins;
const EtsyInactivePins = models.EtsyInactivePins;
const ItemOption = models.ItemOption;
const R = require('ramda');

const API_KEY = process.env.ETSY_API_KEY;

async function fetchEtsyInventoryForListing(listingId) {
    const ETSY_API_URL =
        `https://openapi.etsy.com/v2/listings/${listingId}/inventory?api_key=${API_KEY}&includes=MainImage`;
    const response = fetch(ETSY_API_URL, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
    })
        .then(res => res.json())
        .then(listingData => {
            let products = R.path(['results', 'products'], listingData);
            let options = []
            if (products !== undefined && products) {
                products.forEach(product => {
                    let option = {
                        price: R.path(['offerings', 0, 'price', 'currency_formatted_raw'], product),
                        quantity: R.pathOr(NaN, ['offerings', 0, 'quantity'], product),
                        description: R.pathOr('Default', ['property_values', 0, 'values', 0], product),
                    }
                    options.push(option);
                })
                return options;
            } else {
                throw new Error("no products");
            }

        })
        .catch(err => console.log("Error in fetching inventory for etsy listing: \n" + err));
    return await response;
}
async function fetchEtsyDataForListing(listingId) {
    const ETSY_API_URL =
        `https://openapi.etsy.com/v2/listings/${listingId}?fields=title,price,currency_code,user_id,url,inventory&api_key=${API_KEY}&includes=MainImage`;
    const response = fetch(ETSY_API_URL, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
    })
        .then(res => res.json())
        .then(listingData => {
            return {
                title: R.path(['results', 0, 'title'], listingData),
                imageUrl: R.path(['results', 0, 'MainImage', 'url_fullxfull'], listingData),
                postingUrl: R.path(['results', 0, 'url'], listingData),
                originalCurrency: R.path(['results', 0, 'currency_code'], listingData),
            }

        })
        .catch(err => console.log("Error in fetching data for etsy listing: \n" + err));
    return await response;
}
async function fetchShopDataForListing(listingId) {
    const ETSY_API_URL =
        `https://openapi.etsy.com/v2/shops/listing/${listingId}?api_key=${API_KEY}`
    const response = fetch(ETSY_API_URL, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
    })
        .then(res => res.json())
        .then(listingData => {
            return {
                artistName: R.path(['results', '0', 'shop_name'], listingData)
            }
        })
        .catch(err => console.log("Error in fetching shop data for etsy listing: \n" + err));
    return await response;
}

async function checkIfActive(listingId) {
    const ETSY_API_URL =
        `https://openapi.etsy.com/v2/listings/${listingId}?fields=state&api_key=${API_KEY}`;
    const response = fetch(ETSY_API_URL, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
    })
        .then(res => res.json())
        .then(listingData => {
            return  R.path(['results', '0',  'state'], listingData);
        })
        .catch(err => console.log("Error in fetching shop data for etsy listing: \n" + err));
    return await response;
}

async function constructEtsyPin(listingId, url) {
    let pinStatus = await checkIfActive(listingId);
    if (pinStatus !== 'active') {
        let pinData = new EtsyInactivePins(url, pinStatus);
        return pinData;
    }
    const [listingData, inventory, shopData] = await Promise.all(
        [fetchEtsyDataForListing(listingId), fetchEtsyInventoryForListing(listingId), fetchShopDataForListing(listingId)])
    if (listingData !== undefined && inventory !== undefined && shopData !== undefined) {
        let pinData = new EtsyPins(listingData.title, listingData.imageUrl, listingData.postingUrl,
            shopData.artistName, listingData.originalCurrency);
        inventory.forEach(option => {
            pinData.addOptions(new ItemOption(option.description, option.price, option.shipping, option.quantity));
        });
        return pinData;
    } else {
        throw new Error("Error in constructing Etsy Pin Data");
    }
}

let count = 0;
async function generateEtsyDataSingleUrl(url) {
    const METHOD_TAG = 'Etsy.generateEtsyDataSingleUrl';
    count = count + 1;
    await sleeps(1000 * count);
    let listingId = getListingIdFromUrl(url);
    let etsyData;
    if (listingId !== undefined) {
        try {
            etsyData = await constructEtsyPin(listingId, url);
            etsyData.success = true;
            console.log(METHOD_TAG + " successfully generated data for " + url);
            // console.log("Data pushed from listing " + listingId + ":\n" + data);
        } catch (err) {
            console.error("Etsy_data.generateEtsyData: " + "unable to generate data for etsy url-" + url);
            etsyData = { success: false, info: err }
        };
    } else {
        etsyData = { success: false, info: 'No Listing ID found in URL ' + url }
    }
    return etsyData;
}

async function sleeps(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function generateEtsyData(urls) {
    const CLASS = "Etsy_data.generateEtsyData: "

    let promises = [];
    let etsyData = [];
    // let callNum = 0;
    for (let i = 0; i < urls.length; i++) {
        let url = urls[i];
        await sleeps(1000);
        console.log(CLASS + "processing url " + url);
        let listingId = getListingIdFromUrl(url);
        if (listingId !== undefined) {
            let etsyPromise = constructEtsyPin(listingId).then(data => {
                etsyData.push(data);
                console.log("Data pushed from listing " + listingId + ":\n" + data);
            },
                err => {
                    console.error("Etsy_data.generateEtsyData: " + "unable to generate data for etsy url-" + url);
                });
            promises.push(etsyPromise);
        }
    }
    // urls.forEach(url => {

    // })
    // let interval = setInterval( () => {
    //     let url = urls[callNum];
    //     callNum++;
    //     if (callNum >= urls.length) {
    //         clearInterval(interval);
    //     }

    // }, 1000);
    let results = await Promise.all(promises);
    return etsyData;

}



function getListingIdFromUrl(url) {
    let listingRegex = /listing\/(\d+)\//
    let matches = url.match(listingRegex);

    if (matches.length >= 2) {
        let listingId = Number.parseInt(matches[1]);
        if (listingId !== NaN) {
            return listingId;
        }
    }
    return undefined;
}

module.exports = {
    generateEtsyData: generateEtsyDataSingleUrl
}