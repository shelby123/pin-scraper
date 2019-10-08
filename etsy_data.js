const fetch = require('node-fetch');
const models = require('./models');
const EtsyPins = models.EtsyPins;
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
            console.log(listingData);
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

async function constructEtsyPin(listingId) {
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

async function generateEtsyData(urls) {
    let promises = [];
    let etsyData = [];
    urls.forEach(url => {
        let listingId = getListingIdFromUrl(url);
        console.log("Listing ID from URL : " + listingId);
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
    })
    let results = await Promise.all(promises);
    return etsyData;

}

let url = ["https://www.etsy.com/listing/720817894/preorder-greek-gods-cute-eeveelutions?ref=cart"];
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
    generateEtsyData: generateEtsyData
}