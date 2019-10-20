
class ItemOption {
    constructor(description, price, shipping, quantity= NaN) {
        this.price = price;
        this.description = description;
        this.shipping = shipping;
        this.quantity = quantity;
    }
}

class EtsyInactivePins {
    constructor(postingUrl, state) {
        this.url = postingUrl;
        this.state = state;
    }
}

class EtsyPins {
    constructor(name, imageUrl, postingUrl, artistName, originalCurrency) {
        this.name = name;
        this.imageUrl = imageUrl;
        this.url = postingUrl;
        this.artistName = artistName;
        this.itemOptions = [];
        this.originalCurency = originalCurrency;
        this.pinType = 3;
    }
    addOptions(itemOption) {
        this.itemOptions.push(itemOption);
    }
    getOptions() {
        return this.itemOptions;
    }
}

class KickStarterPins {

    constructor(name, imageUrl, postingUrl, artistName, endDate, originalCurrency) {
        this.name = name;
        this.imageUrl = imageUrl;
        this.url = postingUrl;
        this.artistName = artistName;
        this.endDate = endDate;
        this.itemOptions = [];
        this.originalCurency = originalCurrency;
        this.pinType = 0;
    }

    addOptions(itemOption) {
        this.itemOptions.push(itemOption);
    }
    getOptions() {
        return this.itemOptions;
    }
}

class ShopifyPins {

    constructor(name, imageUrl, postingUrl, artistName, originalCurrency) {
        this.name = name;
        this.imageUrl = imageUrl;
        this.url = postingUrl;
        this.artistName = artistName;
        this.originalCurrency = originalCurrency;
        this.itemOptions = [];
        this.pinType = 1;
    }

    addOptions(itemOption) {
        this.itemOptions.push(itemOption);
    }
    getOptions() {
        return this.itemOptions;
    }
}

module.exports = {
    ItemOption: ItemOption,
    KickStarterPins: KickStarterPins,
    ShopifyPins: ShopifyPins,
    EtsyPins: EtsyPins,
    EtsyInactivePins: EtsyInactivePins,

}