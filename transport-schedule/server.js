const fetch = require('node-fetch');
const sha1 = require('js-sha1');
const convert = require('xml-js');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const server = require('http').createServer(app);
const io = require("socket.io")(server);

app.use(express.static(__dirname + '/client'));
app.use(bodyParser.json());
app.get('/', (request, response) => {
    response.sendFile(path.join(__dirname, 'index.html'));
});

io.on("connection", (socket) => {
    console.log("new connection");

    socket.on("init map", msg => {
        io.emit("init map", data);
    });

    socket.on("addFavoriteStop", msg => {
        favoriteStops.push(msg.favoriteStop);
    });

    socket.on("removeFavoriteStop", msg => {
        favoriteStops.pop(msg.favoriteStop);
    });

    socket.on("getFirstArrivalToStop", msg => {
        getFirstArrivalToStop(msg.ks_id)
        .then(response => parseDataArrival(JSON.parse(response)))
        .then(parsedData => io.emit("getFirstArrivalToStop", parsedData))
    });

    socket.on("getRouteArrivalToStop", msg => {
        getRouteArrivalToStop(msg.ks_id, msg.kr_id)
        .then(response => parseDataArrival(JSON.parse(response)))
        .then(parsedData => io.emit("getRouteArrivalToStop", parsedData))
    });

    socket.on("initRoute", msg => {
        let route = routesStructure["routes"]["route"];
        let data = determineRoute(route, {ks_id: msg.ks_id, direction: msg.direction}, msg.routeNumber, msg.transportType);
        io.emit("initRoute", data);
    });
});

server.listen(5000, function() {
    console.log('Server listening on 5000');
});


function main(){
    getStops();
    getRoutesStructure();
}

main();

function sendRequest (url) {
    return fetch(url)
        .then((result) => { return result.text() })
        .catch((error) => { console.log(error); });
}


let favoriteStops = [];

let data = {
  stops: undefined,
  favoriteStops: favoriteStops
}

function removeJsonTextAttribute(value, parentElement){
    var keyNo = Object.keys(parentElement._parent).length;
    var keyName = Object.keys(parentElement._parent)[keyNo - 1];
    parentElement._parent[keyName] = value;
}

function parseData(stops){
    let stopsArr = JSON.parse(stops);
    stopsArr = stopsArr.stops.stop;
    let result = [];
    for(let i = 0; i < stopsArr.length; ++i){
        for(const key in stopsArr[i]){
            if(Object.keys(stopsArr[i][key]).length === 0) stopsArr[i][key] = undefined;
        }
        let stopObj = {};
        stopObj.title = stopsArr[i].title;
        stopObj.ks_id = stopsArr[i].KS_ID;
        stopObj.adjacentStreet = stopsArr[i].adjacentStreet;
        stopObj.direction = stopsArr[i].direction;
        stopObj.busesMunicipal = stopsArr[i].busesMunicipal;
        stopObj.busesCommercial = stopsArr[i].busesCommercial;
        stopObj.busesPrigorod = stopsArr[i].busesPrigorod;
        stopObj.busesSeason = stopsArr[i].busesSeason;
        stopObj.busesSpecial = stopsArr[i].busesSpecial;
        stopObj.busesIntercity = stopsArr[i].busesIntercity;
        stopObj.trams = stopsArr[i].trams;
        stopObj.trolleybuses = stopsArr[i].trolleybuses;
        stopObj.latitude = Number(stopsArr[i]["latitude"]);
        stopObj.longitude = Number(stopsArr[i]["longitude"]);
        result.push(stopObj);
    }
    return result;
}

function getStops(){
  sendRequest('https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml')
  .then(data => convert.xml2json(data, {textFn: removeJsonTextAttribute, compact: true, spaces: 4}))
  .then(stops => parseData(stops))
  .then(stops =>  data.stops = stops)
}

function getRoutesStructure(){
  sendRequest('https://tosamara.ru/api/v2/classifiers/routesAndStopsCorrespondence.xml')
  .then(data => convert.xml2json(data, {compact: true, spaces: 4}))
  .then(routesStructureString => routesStructure = JSON.parse(routesStructureString))
}

function getFirstArrivalToStop(ks_id){
  var authkey = sha1(ks_id + "just_f0r_tests");
  let url = `https://tosamara.ru/api/v2/json?method=getFirstArrivalToStop&KS_ID=${ks_id}&os=android&clientid=test&authkey=${authkey}`
  return sendRequest(url)
}

function getRouteArrivalToStop(ks_id, kr_id){
  var authkey = sha1(kr_id + ks_id + "just_f0r_tests");
  let url = `https://tosamara.ru/api/v2/json?method=getRouteArrivalToStop&KS_ID=${ks_id}&KR_ID=${kr_id}&os=android&clientid=test&authkey=${authkey}`
  return sendRequest(url);
}

function parseDataArrival(data){
    let parsedData = [];
    let arrival = data['arrival']
    arrival.forEach(element =>{
        let minutes = Math.floor(element['timeInSeconds'] / 60);
        let result = `${element['type']} №${element['number']} прибудет через ${minutes} минут`;
        parsedData.push(result);
    })
    return parsedData;
}

function determineTransportTypeId(transportType){
  if(transportType.includes('trolleybuses')) return 4;
  if(transportType.includes('buses')) return 1;
  if(transportType.includes('metros')) return 2;
  if(transportType.includes('trams')) return 3;
}

function determineRoute(data, stop, routeNumber, transportType){
  let transportTypeID = determineTransportTypeId(transportType);
  let ksIds = [];
  let krId = undefined;
  let result = undefined;
  data.forEach(route => {
    let number = route["number"]["_text"];
    let id = route["transportType"].id["_text"];
    if(number === routeNumber && id == transportTypeID){
      let stops = route["stop"];
      stops.forEach(item =>{
        let ks_id = item.KS_ID["_text"];
        let direction = item.direction["_text"];
        if(ks_id === stop.ks_id && direction === stop.direction) {
          krId = route["KR_ID"]["_text"];
          result = stops;
          return;
        }; 
      });
    }
  });
  result.forEach(stop => {
    ksIds.push(stop["KS_ID"]["_text"]);
  });
  return {krId, ksIds};
}