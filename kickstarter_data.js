
const axios = require('axios');
const cheerio = require('cheerio');
const models = require('./models');
const ItemOption = models.ItemOption;
const KickStarterPins = models.KickStarterPins;

async function generateKickstarterData(urls) {
    let kickStarterData = [];
    let promises = [];
    urls.forEach(url => {
        let kickStarterPin;
        let axiosPromise = axios.get(url)
            .then((response) => {
                let itemOptions = [];
                const $ = cheerio.load(response.data);                
                $('.NS_projects__rewards_list > ol > li')
                    .not('.pledge--no-reward')
                    .not('.pledge--all-gone')
                    .find('.pledge__info')
                    .each((i, elem) => {
                        const currencyConversionSpan = $(elem).find('.pledge__currency-conversion span');
                        let converted = currencyConversionSpan.text();
                        converted = Number(converted.replace(/[^0-9.-]+/g,""));

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
                    console.log(date);
                    kickStarterPin = new KickStarterPins(name, imageUrl, postingUrl, artistName, date, currency);
                    itemOptions.forEach(item => { kickStarterPin.addOptions(item); })
                    // console.log(kickStarterPin);
                });
                kickStarterData.push(kickStarterPin);
                console.log(kickStarterData);
            })
            .catch(error => {
                console.log(error);
            });
        promises.push(axiosPromise);
    });
    await Promise.all(promises);
    console.log("finished generating kickstarter data");
    return kickStarterData;
}


module.exports = {
    generateKickstarterData: generateKickstarterData
}