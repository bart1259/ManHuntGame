const express = require('express')
const https = require('https')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
 
const DEBUG = true

const PORT = process.env.PORT || 443;
const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    next()
})

// log with morgan
const morgan = require('morgan');
const fs = require('fs');
let logFile = fs.createWriteStream('./log.log', {flags: 'a'});
app.use(morgan('combined', {stream: logFile}));

const sessions = {}
const players = {}

const generateSessionId = () => {
    // Return 6 character random string of numbers and letters
    let sessionId = Math.random().toString(36).substring(2, 8).toUpperCase()
    if (sessions[sessionId]) {
        return generateSessionId()
    }
    return sessionId
}

const generatePlayerId = () => {
    // Return 6 character random string of numbers and letters
    let playerId = Math.random().toString(36).substring(2, 8).toUpperCase()
    if (players[playerId]) {
        return generatePlayerId()
    }
    return playerId
}

app.get('/health', (req, res) => {
    res.send('Healthy!')
})

app.post('/startSession', (req, res) => {
    console.log("Start Session")
    const sessionId = generateSessionId()
    const runnerId = generatePlayerId()

    let session = {
        sessionId: sessionId,
        runnerId: runnerId,
        status: 'waiting',
        locations: []
    } 

    sessions[sessionId] = session
    console.log(sessions[sessionId])
    res.send(sessions[sessionId])
})

const filterLocations = (locations) => {
    const lag_minutes = DEBUG ? 1 : 5;
    const lag_ms = lag_minutes * 60 * 1000;
    return locations.filter(location => {
        return Date.now() - location.timestamp > lag_ms
    })
}

app.post('/getSession', (req, res) => {
    console.log("Get Session")
    // Get session ID and player ID from json
    const sessionId = req.body.sessionId
    const playerId = req.body.playerId

    if (!sessions[sessionId]) {
        res.status(404).send('Session not found')
    }

    if (sessions[sessionId].runnerId === playerId) {
        let session = sessions[sessionId]
        session = {...session}
        session.chaserLocations = filterLocations(session.locations)
        res.send(session)
    } else {
        let session = sessions[sessionId]
        session = {...session}
        session.locations = filterLocations(session.locations)
        res.send(session)
    }

})

app.post('/updateLocation', (req, res) => {
    console.log("Updating location")
    console.log(req.body)
    // Get session ID and player ID from json
    const sessionId = req.body.sessionId
    const playerId = req.body.playerId
    const lat = req.body.lat
    const lon = req.body.lon

    if (!sessions[sessionId]) {
        res.status(404).send('Session not found')
    }

    if (sessions[sessionId].runnerId !== playerId) {
        res.status(403).send('Player not authorized to update location')
    }

    sessions[sessionId].locations.push({
        lat: lat,
        lon: lon,
        timestamp: Date.now()
    })
    let session = sessions[sessionId]
    session = {...session}
    session.chaserLocations = filterLocations(session.locations)
    res.send(session)
})

// TODO: app.post('/closeSession')

// Frontend hosting;

app.use(express.json());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "../client/build")));

const HTML_FILE = path.join(__dirname, "../client/build/index.html");

app.get("/", (req, res) => {
   res.sendFile(HTML_FILE, function(err){
      if(err){
         res.status(500).send(err);
      }
   });
});

// Host everything in dist folder

// PKI Validation path

if (DEBUG) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${PORT}`)
        }
    )
} else {

    app.get("/" + fs.readFileSync(path.join(__dirname, '../client/cert', 'pki-validation.path')), (req, res) => {
        res.send(fs.readFileSync(path.join(__dirname, '../client/cert', 'pki-validation.txt')));
    })

    const sslServer = https.createServer({
        key: fs.readFileSync(path.join(__dirname, '../client/cert', 'private.key')),
        cert: fs.readFileSync(path.join(__dirname, '../client/cert', 'certificate.crt')),
        ca: fs.readFileSync(path.join(__dirname, '../client/cert', 'ca_bundle.crt')),
    }, app)
    
    sslServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on https://localhost:${PORT}`)
    })
}
