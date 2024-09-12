import './App.css';
import Map from './Map.js'
import NoSleep from 'nosleep.js'

import React, { useState } from 'react';
import { startSession, updateLocation, getSession } from './endpoints.js'

function App() {

  let [noSleep, _] = useState(new NoSleep())

  navigator.geolocation.getCurrentPosition((p) => {
    console.log(p)
  })

  let [screen, setScreen] = useState('home')

  let [playerId, setPlayerId] = useState('')
  let [sessionIdEntered, setSessionIdEntered] = useState('')
  let [session, setSession] = useState({})

  // Runner State
  let [running, setRunning] = useState(false)

  const handleCreateSession = async () => {
    console.log("Creating a new session")
    noSleep.enable()
    startSession().then(session => {
      console.log("Made Session: ", session.sessionId)
      setSession(session)

      setPlayerId(session.runnerId)
      setScreen('runner')
    })
  }

  const handleJoinSession = async () => {
    // Verify session exists
    try {
      console.log("Joining session: ", sessionIdEntered)
      noSleep.enable()
      let session = await getSession(sessionIdEntered, playerId)
      console.log("Session Found!")
      setSession(session)
      setScreen('chaser')

      const updateChaser = () => {
        getSession(sessionIdEntered, playerId).then((curSess) => {
          setSession(curSess)
        })
        navigator.geolocation.getCurrentPosition((position) => {
          ownLocation = position.coords
        })
      }
      updateChaser()

      setInterval(updateChaser, 5000)

    } catch (error) {
      alert(`Session ID: '${sessionIdEntered}' not found`)      
    }
  }

  const handleStartRunning = async () => {
    console.log("Starting to run")
    setRunning(true)

    const updateRunner = () => {
      console.log("Updating Runner...")
      navigator.geolocation.getCurrentPosition((position) => {
        updateLocation(session.sessionId, playerId, position.coords.latitude, position.coords.longitude).then((curSess) => {
          setSession(curSess)
          console.log(curSess)
        })
      }, (error) => {
        console.log(error)
      })
    }

    // Start updating location
    setInterval(updateRunner, 5000)
    updateRunner()
  }

  return (
    <div className="App">
      {
        screen === 'home' &&
        <div>
          <h1>Welcome</h1>
          <div>
            <h2>Join Session:</h2>
            <input type="text" placeholder="Enter Session ID" value={sessionIdEntered} onChange={(e) => {setSessionIdEntered(e.target.value)}}></input>
            <button onClick={handleJoinSession}>Join</button>
          </div>
          <div>
            <h2>Create Session:</h2>
            <button onClick={handleCreateSession} >Create</button>
          </div>
        </div>
      }
      {
        screen === 'runner' &&
        <div>
          <h1>Session: {session.sessionId}</h1>
          <h1>{running ? "Run!" : "Runner! Get Ready to run!"}</h1>
          {
            running == false &&
            <button onClick={handleStartRunning}>Start Running</button>
          }

          <div className='map-container'>
            <Map landmarks={session.locations} redLandmarks={session.chaserLocations}/>
          </div>    

        </div>
      }
      {
        screen === 'chaser' &&
        <div>
          <h1>Session: {session.sessionId}</h1>
          <h1>Chaser! Get ready to chase!</h1>
          <div className='map-container'>
            <Map landmarks={session.locations} ownLocation={ownLocation}/>
          </div>
        </div>
      }
    </div>
  );
}

export default App;
