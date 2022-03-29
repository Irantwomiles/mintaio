const crypto = require('crypto');
const log = require('electron-log');
const request = require('async-request');
const { getStorage } = require('../storage');

class Project {

    constructor({slug, id= crypto.randomBytes(16).toString('hex'), count = 0, setup = true}) {
        this.traitsMap = new Map();

        this.slug = slug;
        this.id = id;
        this.global_cursor = '';
        this.network = '';

        // making sure the project has been added to the DB before attempting to update.
        this.setup = setup;

        this.proxies = [
            "199.187.188.185:10742:dzyamayd:gzP4w13qT0",
            "199.187.190.31:10160:dzyamayd:gzP4w13qT0",
            "199.187.188.240:11838:dzyamayd:gzP4w13qT0",
            "199.187.191.125:11893:dzyamayd:gzP4w13qT0",
            "199.187.188.122:12070:dzyamayd:gzP4w13qT0"];

        this.api_keys = [
            "852d4657fe794045abf12f206af777ad",
            "72fdb7cff7064b70807e0f32d4ec3fa3",
            "d0c85ca2a84143c393992626e26c10f7",
            "d81bee3e75c64ae79541373f4c32295b",
            "57fcc64ba50648d6a93f21a0e05fc1a7",
            "2fe149332c264e008aa46f2fce2301d1",
            "b0fb08d7c8f049009ef4b32440d2c4cc",
            "2e7ef0ac679f4860bbe49a34a98cf5ac",
            "72fdb7cff7064b70807e0f32d4ec3fa3",
            "d0c85ca2a84143c393992626e26c10f7",
            "284ac5f7b70846faa889f8af0bff60c8",
            "d81bee3e75c64ae79541373f4c32295b",
            "54f28eb29db648719c2eaaabccc414fc",
            "2af2cffde08c407590529cdbab8d1646",
            "fd19e5cba6e243719640f90f9f1f1d1e",
            "1a6aaeab958148a3a42d1d801912c91f",
            "790d4e9223714481a11633acbda338de"];

        this.throttled_cursor = [];
        this.count = count;
        this.db = getStorage();
    }

    getTraitsMap() {
        return this.traitsMap;
    }

    setTraitsMap(map) {
        for(const k of map) {
            this.traitsMap.set(k, map.get(k));
        }
    }

    async getAssetsByTrait (network, slug, cursor, api_key) {

        const p = this.proxies[Math.floor(Math.random() * this.proxies.length)].split(':');
        const username = p[2], password = p[3], host = p[0], port = p[1];

        log.info(`[Project] Checking project ${slug} cursor ${cursor} with Proxy ${p}`);

        const asset_url = `https://${network}api.opensea.io/api/v1/assets?collection_slug=${slug}&limit=50&cursor=${cursor}`

        try {

            const res = await request(asset_url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
                    "Accept": "application/json",
                    "X-API-KEY": api_key
                },
                proxy: `http://${username}:${password}@${host}:${port}`
            });

            if(res.statusCode !== 200) {
                log.info(`[Project] Status is ${res.statusCode} API key ${api_key} Proxy: ${p}`);
                this.throttled = true;
                return;
            }

            const json_body = JSON.parse(res.body);

            for(const asset of json_body.assets) {

                for(const trait of asset.traits) {

                    const trait_exists = this.traitsMap.has(`${trait.trait_type}_${trait.value}`);

                    if(trait_exists) {

                        if(this.traitsMap.get(`${trait.trait_type};${trait.value}`).includes(asset.token_id)) {
                            continue;
                        }
                        this.traitsMap.get(`${trait.trait_type};${trait.value}`).push(asset.token_id);

                    } else {
                        this.traitsMap.set(`${trait.trait_type};${trait.value}`, [asset.token_id]);
                    }

                }

                this.count++;
            }

            if(this.setup) {

                this.db.projects.update({id: this.id}, {
                $set: {
                    count: this.count,
                    global_cursor: this.global_cursor,
                    data: Object.fromEntries(this.traitsMap)
                }}, {}, function(err, numReplaced) {

                    if(err) {
                        log.info(`[Project] Error while saving data ${err}`);
                        return;
                    }

                    log.info(`[Project] Saved data successfully numReplaced: ${numReplaced}.`);
                })

            }

            log.info(`[Project] Success got asset with API key ${api_key} Proxy: ${p} next Cursor: ${json_body.next === null ? 'NULL' : json_body.next} Count: ${this.count}`);
            log.info("-----------------------------------------");

            return json_body.next === null ? '' : json_body.next;
        } catch(e) {
            log.info(`[Project] Error ${e.message} while getting asset ${api_key} Proxy: ${p} ${this.count}`);
            log.info("-----------------------------------------");
            return cursor; // if error, return the cursor we just went with
        }

    }

    startFetchingAssets() {

        log.info(`[Project] Started to fetch assets.`);

        if(typeof this.interval !== 'undefined') {
            log.info("[Project] this project is already fetching assets.");
            return;
        }

        let api_key = '';
        let throttle_counter = 0;
        let key_index = 0;

        this.interval = setInterval(async () => {

            if(this.throttled) {

                log.info(`[Project] API Keys throttled ${throttle_counter}.`);

                throttle_counter++;

                if(throttle_counter === 4) {
                    this.throttled = false;
                    throttle_counter = 0;
                    log.info(`[Project] Starting to fetch assets again ${throttle_counter}.`);
                }

                return;
            }

            if(key_index >= this.api_keys.length) {
                key_index = 0;
            }

            api_key = this.api_keys[key_index];

            const res = await this.getAssetsByTrait(this.network, this.slug, this.global_cursor, api_key);

            if(typeof res !== 'undefined' && res.length === 0) {
                log.info(`[Project] Finished with ${this.count} assets captured.`);
                clearInterval(this.interval);
            }

            if(typeof res !== 'undefined') {
                this.global_cursor = res;
            } else {
                log.info(`[Project] Error, sending with old cursor, ${this.global_cursor}`);
            }

            key_index++;

        }, 1.25 * 1000);

    }

}

module.exports = {
    Project
}