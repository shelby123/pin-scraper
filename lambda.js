// import { generateKickstarterData } from './kickstarter_data';
// import { generateShopifyData} from './shopify_data';

const kickstarter_data = require("./kickstarter_data");
const shopify_data = require("./shopify_data");
const etsy_data = require("./etsy_data");
const fetch = require('node-fetch');

const DB_URL = process.env.DB_URL_ENV;
const DB_URL_POST_PIN_DATA = process.env.DB_URL_POST_PIN_DATA_ENV;

async function postData(url = '', data = {}) {
    // Default options are marked with *
    const response = fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    }).then(res => res.json());
    return await response; // parses JSON response into native JavaScript objects
}

async function getUrls() {
    const urls = [];
    await fetch(DB_URL)
        .then(response => response.json())
        .then(body => {
            for (let i = 0; i < body.length; i++) {
                let urlObj = body[i];
                if (urlObj.pinType !== undefined) {
                    urls.push(urlObj);
                }
            }
        })
    return urls;
}

function reflect(promise){
    return promise.then(function(v){ return {v:v, status: "fulfilled" }},
                        function(e){ return {e:e, status: "rejected" }});
}


async function gatherData() {
    console.log("About to gather Data");
    let data = [];
    try {
        let urls = await getUrls();
        console.log("Lamdba.gatherData: Urls from the DB: ");
        console.log(urls);
        const kickstarterUrls = urls.filter(item => item.pinType === 0).map(item => item.url);
        const shopifyUrls = urls.filter(item => item.pinType === 1).map(item => item.url);
        const etsyUrls = urls.filter(item => item.pinType === 3).map(item => item.url);
        // console.log("GatherData.Urls : " + urls);
        let pinDataSegments = await Promise.all([
                    kickstarter_data.generateKickstarterData(kickstarterUrls),
                    shopify_data.generateShopifyData(shopifyUrls),
                    etsy_data.generateEtsyData(etsyUrls),
                ]);
        let pinData = pinDataSegments[0].concat(pinDataSegments[1]).concat(pinDataSegments[2]);
        console.log("Lambda.GatherData: pinData : " + pinData);
        const pinPromises = [];
        pinData.forEach(pin => {
            try {
                if (pin !== undefined) {
                    console.log("Lambda.GatherData: calling to post data " + pin + " " + pin.url);
                    const pinPromise = postData(DB_URL_POST_PIN_DATA, pin);
                    pinPromises.push(pinPromise);
                } else {
                    console.log("Lambda.GatherData: skipping undefined pin");
                }
               
            } catch (error) {
                console.error(error);
            }
        })
        const pinResults = [];
        await Promise.all(pinPromises.map(reflect))
            .then(results => {
                const successfulResults = results.filter(x => x !== undefined && x.status === 'fulfilled');
                const failedResults = results.filter(x => x === undefined || x.status !== 'fulfilled');
                console.log("URLs processed: " + successfulResults.length);
                console.log("URLs FAILED to process: " + failedResults.length);
                pinResults.push(successfulResults)
            });
        return pinResults;
    } catch(e) {
        console.log(e);
    }
}
// async function temp() {
// let results = await gatherData();
// console.log("Final results ");
// console.log(results.map(res=> res.v));
// }
// temp();
exports.handler = async function (event, context) {
    console.log("Handler: event is ");
    console.log(event);
    let results = await gatherData();
    context.succeed(results);
};