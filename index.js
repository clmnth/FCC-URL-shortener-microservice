require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
// Solution - Install dns
const dns = require('dns');
// Solution - Install and Set Up Mongoose
const mongoose = require('mongoose');
// Solution - Import the body-parser module
const bodyParser = require("body-parser")
// Solution - Import the url module
const url = require('url');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Solution - Create a Model
const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
    unique: true
  },
  short_url: {
    type: String,
    required: true,
    unique: true
  }
});
let urlModel = mongoose.model("url", urlSchema);

//Solution - Use body-parser to Parse POST Requests
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// Solution - Get data from POST requests and add them to the database
app.post("/api/shorturl", async (req, res) => {
  let data = req.body.url;
  // remove protocol https:// or http://
  let hostname = url.parse(data).hostname;
  let shortUrl = 1;

  // Check if input starts with http:// or https://
  if (!/^https?:\/\//i.test(data)) {
    res.json({ error: 'invalid url' });
    return;
  }

  // Check if the website exists
  dns.lookup(hostname, async (err, value) => {
    if (err) {
      console.log(err, "<= error")
      res.json({ error: 'invalid url' });
      return;
    }

    // Handle the shorturl
    try {

      // Create a unique and incremented URL
      const count = await urlModel.countDocuments({});
      shortUrl = count + 1;

      // Ckeck if the URL is already in the database
      let existingUrl = await urlModel.findOne({ original_url: data });
      if (existingUrl) {
        res.json({ original_url: existingUrl.original_url, short_url: existingUrl.short_url });
      } else {
        let newUrl = new urlModel({
          original_url: data,
          short_url: shortUrl
        })

        await newUrl.save();

        res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
      }
    } catch (error) {
      console.log(error);
      res.json({ error: 'server error' });
    }
  })
});

// Solution - Redirection to the original URL
app.get("/api/shorturl/:short_url", async (req, res) => {
  const shorturl = req.params.short_url;
  let existingShorturl = await urlModel.findOne({ short_url: shorturl });

  if (existingShorturl) {
    res.redirect(existingShorturl.original_url)
  } else {
    res.json({ "error": "No short URL found for the given input" });
  }
})



// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
