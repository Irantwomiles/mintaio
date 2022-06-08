const http = require('http');
const express = require('express');
const app = express();
const axios = require('axios');
const url = require('url');
const {authenticate_discord} = require("./web3_utils.js");

app.server = http.createServer(app);

app.get('/auth/callback', async (req, res) => {
    console.log("Received callback from discord auth.", req.query);

    const {code} = req.query;

    if(code) {
        await authenticate_discord(code);
    }

})


app.server.listen(1948, () => {
    console.log("Express server starting up");
})
