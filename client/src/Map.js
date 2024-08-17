// Map.jsx
import React from "react";
import { MapContainer, TileLayer, Circle, Polyline  } from 'react-leaflet'

export default function Map(props) {

    const movingAverage = (landmarkPoints, n) => {
      const result = [];
      for(let i = 0; i < landmarkPoints.length; i++) {
          let average = [0, 0];
          let count = i < n ? i : n;
          for(let j = 0; j <= count; j++) {
              average[0] += landmarkPoints[i - j][0];
              average[1] += landmarkPoints[i - j][1];
          }
          result.push([average[0] / (count + 1), average[1] / (count + 1)]);
      }
      return result;
  }

    let landmarks = props.landmarks || [];
    let redLandmarks = props.redLandmarks || [];

    for (let i = 0; i < landmarks.length; i++) {
      for (let j = 0; j < redLandmarks.length; j++) {
        if (landmarks[i].timestamp === redLandmarks[j].timestamp) {
          landmarks.splice(i, 1);
          i--; // when we remove landmark, we need to decrement index to check same index again
          break;
        }
      }
    }
    console.log(redLandmarks.length)

    let landmarkPoints = landmarks.map(a => {
      return [a.lat, a.lon]
    })
    let maPoints = movingAverage(landmarkPoints, 5)

    let redLandmarkPoints = redLandmarks.map(a => {
      return [a.lat, a.lon]
    })
    let redMaPoints = movingAverage(redLandmarkPoints, 5)

    return (
      <MapContainer center={[43.03890000, -87.90647000]} zoom={13} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {
          landmarks.map((landmark, index) => {
            return (
              <Circle 
                center={{lat:landmark.lat, lng: landmark.lon}}
                fillColor="blue" 
                color="blue"
                radius={15}
                opacity={0.5}
              />
            )
          })
        }
        {
          redLandmarks.map((landmark, index) => {
            return (
              <Circle 
                center={{lat:landmark.lat, lng: landmark.lon}}
                fillColor="red" 
                color="red"
                radius={15}
                opacity={0.5}
              />
            )
          })
        }
        <Polyline positions={maPoints} color="blue"/>
        <Polyline positions={redMaPoints} color="red"/>
      </MapContainer>
    );
  }