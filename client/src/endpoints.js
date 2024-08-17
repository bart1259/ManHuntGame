
// Craft API URL based on the current hostname
const API_URL = (window.location.hostname === "localhost" || window.location.hostname.includes("192.168")) ? "http://" + window.location.hostname + ":443" : "https://" + window.location.hostname + ":443";
console.log(API_URL)

// const API_URL = window.location.hostname === "localhost" ? "http://localhost:443" : "http://192.168.68.52:443";

const getHealth = async () => {
    const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.text();
}

const startSession = async () => {
    console.log(`${API_URL}/startSession`)
    const response = await fetch(`${API_URL}/startSession`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return response.json();
}

const getSession = async (sessionId, playerId) => {
    const response = await fetch(`${API_URL}/getSession`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, playerId })
    });
    return response.json();
}

const updateLocation = async (sessionId, playerId, lat, lon) => {
    const response = await fetch(`${API_URL}/updateLocation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ "sessionId": sessionId, "playerId": playerId, "lat": lat, "lon": lon })
    });
    return response.json();
}

export {
    getHealth,
    startSession,
    getSession,
    updateLocation
}