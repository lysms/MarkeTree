const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const uuidv4 = require('uuid').v4;
const cors = require('cors');
const fs = require("fs");
const multer = require("multer");

const app = express();
const port = 3030;

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

let connected = false;
const client = new MongoClient(
  'mongodb+srv://dbUser:MarkeTreePassword@marketree.ridw2.mongodb.net/MarkeTree?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true }
);

async function ensureConnection() {
  if (connected) return;
  try {
    await client.connect();
    connected = true;
  } catch (e) {
    console.error('unable to connect to MongoDB', e);
  }
}

// with a username and password
app.post('/api/create-user', async (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  console.log(username);
  console.log(password);

  if (username == null || username == '' || password == null || password == '') {
    res.json('bad username/password characters');
    return;
  }

  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Users');
    let existinguser = await collection.findOne({ username: username });
    console.log("USER EXISTS ", existinguser);
    if (existinguser) {
      res.json({ err: 'user already exists' });
      return;
    }
  } catch (e) {
    console.error('Unable to search database', e);
    res.json({ err: 'unable to add user' });
    return;
  }


  let saltBuff = crypto.randomBytes(128);
  let salt = saltBuff.toString('hex');
  let saltedPass = password + salt;

  let hasher = crypto.createHash('sha256');
  hasher.update(saltedPass);
  let hashedPass = hasher.digest('hex');

  let cookieBuff = crypto.randomBytes(128);
  let cookie = cookieBuff.toString('hex');

  let cookieSaltBuff = crypto.randomBytes(128);
  let cookieSalt = cookieSaltBuff.toString('hex');

  let saltedCookie = cookie + cookieSalt;

  let hasherCookie = crypto.createHash('sha256');
  hasherCookie.update(saltedCookie);

  let cookieHash = hasherCookie.digest('hex');

  let user = {
    user_id: uuidv4(),
    username: username,
    password_hash: hashedPass,
    password_salt: salt,
    user_rating: null,
    number_ratings: 0,
    cookie_hash: cookieHash,
    cookie_salt: cookieSalt,
  }

  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Users');
    await collection.insertOne(user);
  } catch (e) {
    console.error('Unable to search database', e);
    res.json({ err: 'unable to add user' });
    return;
  }

  res.json({ cookie: cookie });
});

// With a username and a password
app.post('/api/authorize-user', async (req, res) => {
  // username-password for now
  let username = req.body.username;
  let password = req.body.password;
  // assumed strings, not null

  let userId = null;
  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Users');
    let document = await collection.findOne({
      username: username
    });
    userId = document.user_id;
  } catch (e) {
    console.error('Unable to search database', e);
    res.json({ err: 'unable to authorize user' });
    return;
  }

  if (userId == null) {
    res.json({ err: 'bad username/password combination' });
    return;
  }

  // create a cookie for the user
  let cookieBuff = crypto.randomBytes(128);
  let cookie = cookieBuff.toString('hex');

  let cookieSaltBuff = crypto.randomBytes(128);
  let cookieSalt = cookieSaltBuff.toString('hex');

  let saltedCookie = cookie + cookieSalt;

  let hasherCookie = crypto.createHash('sha256');
  hasherCookie.update(saltedCookie);

  let cookieHash = hasherCookie.digest('hex');

  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Users');
    await collection.updateOne({ user_id: userId }, { $set: { cookie_hash: cookieHash, cookie_salt: cookieSalt } });
  } catch (e) {
    console.error('this is really bad...', e);
    res.json({ err: 'unable to authorize user' });
    return;
  }

  res.json({ cookie: cookie });
});

// With a cookie token
app.post('/api/verify-user', async (req, res) => {
  let cookie = req.body.cookie;

  let allUsers = null;
  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Users');
    let cursor = collection.find({}); // high effort, high quality, high efficiency code here.
    allUsers = await cursor.toArray();
  } catch (e) {
    console.error('this pretty bad...', e);
    res.json({ err: 'unable to verify user' });
    return;
  }

  for (user of allUsers) {
    let cookieHash = user.cookie_hash;
    let cookieSalt = user.cookie_salt;

    let hasher = crypto.createHash('sha256');
    hasher.update(cookie + cookieSalt);

    let foundCookieHash = hasher.digest('hex');

    if (foundCookieHash == cookieHash) {
      let outputUser = {
        username: user.username,
        email: user.email,
        user_rating: user.user_rating,
        number_rating: user.number_rating,
        rpi_status: user.rpi_status,
      };
      res.json({ success: true, user: outputUser });
      return;
    }
  }
  console.log('bad cookie: ', cookie);
  res.json({ err: 'unable to verify user' });
});

app.get('/api/listings', async (req, res) => {
  let listings = null;
  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Listings');
    let document = collection.find({});
    listings = await document.toArray();
  } catch (e) {
    console.error('Unable to search database', e);
  }
  if (listings == null) {
    res.json({ err: 'Unable to search listings' })
  } else {
    res.json({ listings: listings });
  }
});



// Create an event, store the event info into the Event collection in the MongoDB
app.post('/post-event', async (req, res) => {
  let message = req.body.data;
  console.log(message);
  let host = message.host;
  let name = message.eventName;
  let location = message.eventLocation;
  let date = message.date;
  let time = message.time;
  let desc = message.description;

  var data = date.split("/");
  var tmp = time.split(":");
  var hour = tmp[0];
  var min = tmp[1];

  // Mongodb Connection
  await ensureConnection();
  let db = client.db('MarkeTree');
  let collection = db.collection('Event');
  let id = await collection.countDocuments();
  let document = await collection.insertOne({
    event_id: id,
    event_host: host,
    event_name: name,
    event_location: location,
    event_month: data[0],
    event_day: data[1],
    event_year: data[2],
    event_hour: hour,
    event_min: min,
    event_description: desc
  });

})

// Get the 'event' information from the DB, and send back to the client.
app.get('/get-event', async (req, res) => {
  await ensureConnection();
  let db = client.db('MarkeTree');
  let collection = db.collection('Event');
  let document = await collection.find();
  let listings = await document.toArray();
  res.send(listings);
})


// Create listing, store the listing item info into the Listing collection in the MongoDB
app.post('/post-listing', async (req, res) => {
  let message = req.body.listingData;
  console.log(message);
  let username = message.username;
  let email = message.email;
  let zip = message.zip;
  let item = message.item;
  let category = message.category;
  let description = message.description;
  let price = message.price;
  let images = message.images;

  let time = Date.now();

  const targetPath = path.join(__dirname, "./frontend/src/images");

  if (item == null || item == '' || category == null || category == ''
    || email == null || email == '' || description == null ||
    description == '' || price == null || price == '') {
    res.json('please fill out all fields');
    return;
  }

  await ensureConnection();

  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Listings');
    let id = await collection.countDocuments();
    let document = await collection.insertOne({
      listing_id: id,
      price: price,
      location: zip,
      name: item,
      description: description,
      category: category,
      seller: 1,
      buyer: null,
      time: time,
      images: images
    });
    userId = document.user_id;
  } catch (e) {
    console.error('Unable to search database', e);
  }

})

app.get('/browse-listing', async (req, res) => {

  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Listings');
    let document = await collection.find();
    let listings = await document.toArray();
    res.send(listings);
  } catch (e) {
    console.error('Unable to search database', e);
  }

})

//http://localhost:3030/get-listing/1
app.get('/get-listing/:id', async (req, res) => {

  await ensureConnection();
  try {
    let db = client.db('MarkeTree');
    let collection = db.collection('Listings');
    let id = req.params.id;
    id = parseInt(id);
    let document = await collection.findOne({ listing_id: id });
    console.log('id', id, 'document', document);
    res.send(document);
  } catch (e) {
    console.error('Unable to search database', e);
  }

})







// Listen to the port 3000
app.listen(port, () => {
  console.log('listening on *:3030')
})