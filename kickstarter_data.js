
const axios = require('axios');
const cheerio = require('cheerio');
const models = require('./models');
const ItemOption = models.ItemOption;
const KickStarterPins = models.KickStarterPins;

const CLASS = "Kickstarter_data.generateKickStarterData: "

function createKickstarterPinObjFromHtml(siteHtml) {
    let itemOptions = [];
    let kickStarterPin;
    const $ = cheerio.load(siteHtml);
    $('.NS_projects__rewards_list > ol > li')
        .not('.pledge--no-reward')
        .not('.pledge--all-gone')
        .find('.pledge__info')
        .each((i, elem) => {
            const currencyConversionSpan = $(elem).find('.pledge__currency-conversion span');
            let converted = currencyConversionSpan.text();
            converted = Number(converted.replace(/[^0-9.-]+/g, ""));

            const title = $(elem).find('.pledge__title').text().trim();
            itemOptions.push(new ItemOption(title, converted, 0));
        });
    $('[data-initial]').each((i, elem) => {
        initialDataString = $(elem).attr("data-initial");
        initialData = JSON.parse(initialDataString);
        const name = initialData['project']['name'];
        const imageUrl = initialData['project']['imageUrl'];
        const postingUrl = initialData['project']['url'];
        const artistName = initialData['project']['creator']['name'];
        const date = new Date(initialData['project']['deadlineAt'] * 1000);
        const currency = initialData['project']['currency']
        kickStarterPin = new KickStarterPins(name, imageUrl, postingUrl, artistName, date, currency);
        itemOptions.forEach(item => { kickStarterPin.addOptions(item); })
        // console.log(kickStarterPin);
    });
    return kickStarterPin;
}

async function generateKickStarterData(url) {
    const METHOD_TAG = 'Kickstarter.generateKickStarterData';
    console.log(METHOD_TAG + "Generating data for url" + url);
    let kickStarterPin;
    let returnObj = {};
    returnObj.url = url;
    try {
        let axiosResponse = await axios.get(url);
        kickStarterPin = createKickstarterPinObjFromHtml(axiosResponse.data);
        returnObj.success = true;
        returnObj.data = kickStarterPin;
    } catch (error) { // axios error
        returnObj.success = false;
        console.error(METHOD_TAG + ": Error generating data for URL " + url);
        console.error(METHOD_TAG + ": Error is" + String(error));
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            returnObj.error = "Bad response from url: " + error.response.data + " : " + error.response.status;
        } else if (error.request) {
            returnObj.error = "No response recieved from url";
        } else {
            returnObj.error = "Other error occured while processing: " + error;
        }
    }
    return returnObj;
}

// async function generateKickstarterData(urls) {
//     console.log(CLASS + "generate data for " + urls.length + " urls:");
//     console.log(urls);
//     let kickStarterData = [];
//     let promises = [];
//     urls.forEach(url => {
//         let kickStarterPin;
//         let axiosPromise = axios.get(url)
//             .then((response) => {
//                 let itemOptions = [];
//                 const $ = cheerio.load(response.data);
//                 $('.NS_projects__rewards_list > ol > li')
//                     .not('.pledge--no-reward')
//                     .not('.pledge--all-gone')
//                     .find('.pledge__info')
//                     .each((i, elem) => {
//                         const currencyConversionSpan = $(elem).find('.pledge__currency-conversion span');
//                         let converted = currencyConversionSpan.text();
//                         converted = Number(converted.replace(/[^0-9.-]+/g, ""));

//                         const title = $(elem).find('.pledge__title').text().trim();
//                         itemOptions.push(new ItemOption(title, converted, 0));
//                     });
//                 $('[data-initial]').each((i, elem) => {
//                     initialDataString = $(elem).attr("data-initial");
//                     initialData = JSON.parse(initialDataString);
//                     const name = initialData['project']['name'];
//                     const imageUrl = initialData['project']['imageUrl'];
//                     const postingUrl = initialData['project']['url'];
//                     const artistName = initialData['project']['creator']['name'];
//                     const date = new Date(initialData['project']['deadlineAt'] * 1000);
//                     const currency = initialData['project']['currency']
//                     kickStarterPin = new KickStarterPins(name, imageUrl, postingUrl, artistName, date, currency);
//                     itemOptions.forEach(item => { kickStarterPin.addOptions(item); })
//                     // console.log(kickStarterPin);
//                 });
//                 kickStarterData.push(kickStarterPin);
//             })
//             .catch(error => {
//                 console.error(CLASS + "error creating kickstarter data for url :" + url)
//                 console.error(CLASS + error);
//             });
//         promises.push(axiosPromise);
//     });
//     await Promise.all(promises);
//     console.log(CLASS + "finished generating kickstarter data");
//     return kickStarterData;
// }


module.exports = {
    generateKickstarterData: generateKickStarterData
}