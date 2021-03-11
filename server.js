const express = require('express')
const app = express()
const port = 3000


const path = require('path')
// app.use(express.static(__dirname + '/frontend'));
// Static Files
app.use(express.static('public'));


// folder example
app.use('/css', express.static(__dirname + './public/css'))
app.use('/css', express.static(path.join(__dirname, "node_modules/bootstrap/dist/css")))

app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
// Set View's
// app.set('views', './frontend');
// app.set('view engine', 'ejs');


// Navigation
app.get('', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/Dashboard/dashboard.html'))
})

// Home Page
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/Dashboard/dashboard.html'))
})

// Home page after login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/LoginDashboard/LoginDashboard.html'))

})
// About
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/About/about.html'))
})

// Event Page
app.get('/event', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/BrowseEvents/browseEvents.html'))
})

// Profile Page
app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/Profile/profile.html'))
})

// Help center
app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/FileScam/fileScam.html'))
})

//BrowseListing api
app.get('/browselisting', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/BrowseListings/browseListings.html'))
})
// listing api
app.get('/listing', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/Listing/listing.html'))
})


//Create Listing API
app.get('/create', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/CreateListing/createListing.html'))
})

// Listen to the port 3000
app.listen(port, () => {
  console.log('listening on *:3000')
})