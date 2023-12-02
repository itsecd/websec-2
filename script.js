let favoriteList=[]

let myMap

let placemarks = new Map();

ymaps.ready(init);

var modal_1 = document.getElementById("list-modal-1");

var modal_2 = document.getElementById("list-modal-2");

var span_1 = document.getElementsByClassName("close-1")[0];

var span_2 = document.getElementsByClassName("close-2")[0];

var urlBusStation = 'https://cdn-icons-png.flaticon.com/512/5193/5193846.png';
var urlTrolleybusStation = 'https://cdn-icons-png.flaticon.com/512/7483/7483254.png';
var urlTramvaiStation = 'https://cdn-icons-png.flaticon.com/512/635/635753.png';
var urlMetroStation = 'https://cdn-icons-png.flaticon.com/512/50/50300.png';
var urlTrainStation = 'https://cdn-icons-png.flaticon.com/512/2087/2087708.png';
var urlRiverStation = 'https://cdn-icons-png.flaticon.com/512/2376/2376713.png';
var urlOther = 'https://cdn-icons-png.flaticon.com/512/2838/2838912.png';

span_1.onclick = function() {
    modal_1.style.display = "none";
}

window.onclick = function(event) {
    if (event.target === modal_1 && window.innerWidth >700) {
        modal_1.style.display = "none";
    }
}

span_2.onclick = function() {
    modal_2.style.display = "none";
}

window.onclick = function(event) {
    if (event.target === modal_1 && window.innerWidth >700) {
        modal_2.style.display = "none";
    }
}



async function init() {
    if(localStorage.getItem('favorite')!=null){
        favoriteList = JSON.parse(localStorage.getItem('favorite'))
    }
    renderFavoriteList()
    myMap = new ymaps.Map("YMapsID", {
        center: [53.21199949679999, 50.17764788540023],
        zoom: 15
    });

    let favorites_button = new ymaps.control.Button({
        data: {
            content: "Избранное",
        },
        options: {
            size:'large',
            maxWidth: [28, 150, 178],
            selectOnClick: false,
        },
    })

    favorites_button.events.add('click', function (e){
        renderFavoriteList()
        modal_1.style.display = "block";
    })

    myMap.controls.add(favorites_button, {float: 'left'});

    await getAllStops().then(async stops => {
        let listStops = stops.getElementsByTagName("stop")
        for (let i = 0; i < listStops.length; i++) {
            const KS_ID = listStops[i].getElementsByTagName("KS_ID")[0].textContent
            const title_station = listStops[i].getElementsByTagName("title")[0].textContent
            const transferObj = {
                "KS_ID":KS_ID,
                "title_station":title_station,
                "x": listStops[i].getElementsByTagName("latitude")[0].textContent,
                "y": listStops[i].getElementsByTagName("longitude")[0].textContent
            }

            let placemark = new ymaps.Placemark(
                [listStops[i].getElementsByTagName("latitude")[0].textContent, listStops[i].getElementsByTagName("longitude")[0].textContent],
                {
                    balloonContentHeader: "<img id='img_plm_"+KS_ID+"' src='https://img.icons8.com/sf-ultralight/25/null/star.png' onclick='addToFavorite("+JSON.stringify(transferObj)+")' alt=\"photo\"'/>"+
                        title_station,
                    balloonContentBody: ("Остановка " + listStops[i].getElementsByTagName("adjacentStreet")[0].textContent +
                    " " + listStops[i].getElementsByTagName("direction")[0].textContent),
                    hintContent: listStops[i].getElementsByTagName("title")[0].textContent
                }, {
                    iconLayout: 'default#image',
                    iconImageSize: [30, 30],
                    iconImageOffset: [0, 0]
                    
                }
            );

            if (listStops[i].getElementsByTagName("trams")[0].textContent !== "") placemark.options.set('iconImageHref', urlTramvaiStation)
            else if (listStops[i].getElementsByTagName("trolleybuses")[0].textContent !== "") placemark.options.set('iconImageHref', urlTrolleybusStation)
            else if (listStops[i].getElementsByTagName("metros")[0].textContent !== "") placemark.options.set('iconImageHref', urlMetroStation)
            else if (listStops[i].getElementsByTagName("electricTrains")[0].textContent !== "") placemark.options.set('iconImageHref', urlTrainStation)
            else if (listStops[i].getElementsByTagName("riverTransports")[0].textContent !== "") placemark.options.set('iconImageHref', urlRiverStation)
            else  placemark.options.set('iconImageHref', urlOther)

             getFirstArriveToStop(KS_ID).then(allArrives => {
                let msg = "";
                let listArrives = allArrives.getElementsByTagName("transport")
                for (let i = 0; i < listArrives.length; i++){
                    msg += "<div onclick='renderNextStation("+ listArrives[i].getElementsByTagName("hullNo")[0].textContent + ")'>" 
                    + listArrives[i].getElementsByTagName("type")[0].textContent + " " + listArrives[i].getElementsByTagName("number")[0].textContent 
                    + " через " + listArrives[i].getElementsByTagName("time")[0].textContent + " минут <br/></button>"
                    }
                placemark.properties.set('balloonContentFooter', msg);
                });

            placemarks.set(KS_ID, placemark)
            myMap.geoObjects.add(placemark);
        }

        var mySearchControl = new ymaps.control.SearchControl({
            options: {
                provider: new StationSearchProvider(listStops),
                noPlacemark: true,
                resultsPerPage: 5
            }
        });
        myMap.controls.add(mySearchControl, {float: 'right'});

        function StationSearchProvider(stations){
            this.stations = stations;
        }

        StationSearchProvider.prototype.geocode = function (request, options){
            var deferred = new ymaps.vow.defer();
            var geoObjects = new ymaps.GeoObjectCollection();
            var offset = options.skip || 0;
            var limit = options.results || 20;

            var stations = [];
            for (var i = 0, l = listStops.length; i < l; i++){
                if (listStops[i].getElementsByTagName("title")[0].textContent.toLowerCase().indexOf(request.toLowerCase()) != -1) {
                    stations.push(listStops[i]);
                }
            }

            stations = stations.splice(offset, limit);
            for (var i = 0, l = stations.length; i < l; i++){
                geoObjects.add(new ymaps.Placemark([stations[i].getElementsByTagName("latitude")[0].textContent, stations[i].getElementsByTagName("longitude")[0].textContent],
                {
                    name: stations[i].getElementsByTagName("title")[0].textContent,
                    description: "Station " + stations[i].getElementsByTagName("adjacentStreet")[0].textContent + stations[i].getElementsByTagName("direction")[0].textContent,
                },
                ))
            }

            deferred.resolve({
                geoObjects: geoObjects,
                metaData: {
                    geocoder: {
                        request: request,
                        found: geoObjects.getLength(),
                        results: limit,
                        skip: offset
                    }
                }
            });
            return deferred.promise();
        }
    })
}

function checkKSInFavorite(KS_ID){
    if(favoriteList !== null){
        return !!favoriteList.filter(function (item) {
            return item.KS_ID === KS_ID;
        }).length;
    }
}

function addToFavorite(transferObj){
    let img = document.getElementById('img_plm_'+transferObj.KS_ID)
    if(checkKSInFavorite(transferObj.KS_ID)){
        img.src = "https://img.icons8.com/sf-ultralight/25/null/star.png"
        favoriteList = favoriteList.filter((item) => { return item.KS_ID !== transferObj.KS_ID; });
        localStorage.setItem("favorite", JSON.stringify(favoriteList));
        renderFavoriteList()
    }else {
        img.src = "https://img.icons8.com/fluency/25/null/star.png"
        favoriteList.push(transferObj)
        localStorage.setItem("favorite", JSON.stringify(favoriteList));
        renderFavoriteList()
    }
}

function getAllStops(){
    return fetch("https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml")
        .then(
            response => response.text())
        .then(str => {
            return new DOMParser().parseFromString(str, "application/xml");
            }
        )
}

function getFirstArriveToStop(KS_ID) {
    return fetch(`https://tosamara.ru/api/v2/xml?method=getFirstArrivalToStop&KS_ID=${KS_ID}&os=android&clientid=test&authkey=${SHA1(KS_ID + "just_f0r_tests")}`)
        .then(
            response => response.text())
        .then(str => {
                return new DOMParser().parseFromString(str, "application/xml");
            }
        )
}

function renderNextStation(hullNo) {
    fetch(`https://tosamara.ru/api/v2/json?method=getTransportPosition&HULLNO=${hullNo}&os=android&clientid=test&authkey=${SHA1(hullNo + "just_f0r_tests")}`)
        .then(response => response.json())
        .then(res => {
            let listElem = document.querySelector('#next-station-list');
            listElem.innerHTML = "<h2>Следующие остановки: </h2>";
            if (!res) {
                const newItem = document.createElement('div');
                newItem.innerHTML = "<h3>Пусто</h3>";
                listElem.appendChild(newItem);
                return;
            }
            for (let stop of res.nextStops) {
                const newItem = document.createElement('div');
                newItem.innerHTML = `
                    <p class="next-station-list-item">
                        <h5>${placemarks.get(stop.KS_ID).properties.get('balloonContentBody')}</h5>
                        <h6>${'Будет через ' + Math.round(+stop.time / 60)}</h6>
                    </p>
                `;
                listElem.appendChild(newItem);
            }

            modal_2.style.display = "block";
        });
}

function renderFavoriteList(){
    let listElem = document.querySelector('#favorite-list');
    listElem.innerHTML = "<h2>Избранное: </h2>";
    if (!favoriteList.length) {
        const newItem = document.createElement('div');
        newItem.innerHTML = "<h3>Пусто</h3>";
        listElem.appendChild(newItem);
        return;
    }

    for (let stop of favoriteList) {
        const newItem = document.createElement('div');
        newItem.innerHTML = `
			<div class="favorite-list-item">
     			<h5>${stop.title_station}</h5>
    		</div>
			`;
        listElem.appendChild(newItem);
        newItem.addEventListener('click', () => {
            myMap.setCenter([stop.x, stop.y]);
            modal_1.style.display = "none";
            placemarks.get(stop.KS_ID).balloon.open();
        });
    }
    modal_1.style.display = "none";
}

function SHA1(msg) {
    function rotate_left(n, s) {
        return (n << s) | (n >>> (32 - s));
    }
    function to_hex_str(val) {
        return ('00000000' + val.toString(16)).slice(-8);
    }

    msg = unescape(encodeURIComponent(msg));
    var H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;
    var msg_len = msg.length, word_array = [];
    for (var i = 0; i < msg_len - 3; i += 4) {
        word_array.push(msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 | msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3));
    }
    switch (msg_len % 4) {
        case 0: i = 0x080000000; break;
        case 1: i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000; break;
        case 2: i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000; break;
        case 3: i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80; break;
    }
    word_array.push(i);
    while (word_array.length % 16 != 14) word_array.push(0);
    word_array.push(msg_len >>> 29);
    word_array.push((msg_len << 3) & 0x0ffffffff);

    for (var blockstart = 0; blockstart < word_array.length; blockstart += 16) {
        var W = word_array.slice(blockstart, blockstart + 16), A = H0, B = H1, C = H2, D = H3, E = H4;
        for (var i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
        for (var i = 0; i <= 79; i++) {
            var temp, K;
            if (i < 20) { temp = ((B & C) | (~B & D)) + 0x5A827999; }
            else if (i < 40) { temp = (B ^ C ^ D) + 0x6ED9EBA1; }
            else if (i < 60) { temp = ((B & C) | (B & D) | (C & D)) + 0x8F1BBCDC; }
            else { temp = (B ^ C ^ D) + 0xCA62C1D6; }
            temp = rotate_left(A, 5) + temp + E + W[i] & 0x0ffffffff;
            E = D; D = C; C = rotate_left(B, 30); B = A; A = temp;
        }
        H0 = H0 + A & 0x0ffffffff; H1 = H1 + B & 0x0ffffffff;
        H2 = H2 + C & 0x0ffffffff; H3 = H3 + D & 0x0ffffffff; H4 = H4 + E & 0x0ffffffff;
    }
    return to_hex_str(H0) + to_hex_str(H1) + to_hex_str(H2) + to_hex_str(H3) + to_hex_str(H4);
}