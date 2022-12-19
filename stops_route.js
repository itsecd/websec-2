const ListTransport = document.querySelector("#transport-list");
const StopName = document.querySelector("#name-stop");
var LOADED_STOPS = null;

var params = (new URL(document.location)).searchParams;
var url_id = params.get("id");

async function load_stops_coord(){
    if (LOADED_STOPS)
        return LOADED_STOPS;
    let url = "https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml";
    try {
        let res = await fetch(url).then( response => response.text() ).then( str => {
            let parser = new window.DOMParser();
            return parser.parseFromString(str, "text/xml") 
            });
        LOADED_STOPS = res.getElementsByTagName("stop");
        return res;
    }
    catch(err) { console.log('err:', err); }
}

function getStopName(KS_ID)
{
    let inner = "";
    let need_i = 0;
    for(; need_i < LOADED_STOPS.length; need_i++)
    {
        if(LOADED_STOPS[need_i].getElementsByTagName("KS_ID")[0].childNodes[0].nodeValue === KS_ID)
            break;
    }
    inner = String(LOADED_STOPS[need_i].getElementsByTagName("title")[0].childNodes[0].nodeValue) + "<br/> " + String(LOADED_STOPS[need_i].getElementsByTagName("adjacentStreet")[0].childNodes[0].nodeValue);
    console.log(inner);
    return inner;
}


async function transportForecast(stopID) {
    let URL = `https://tosamara.ru/api/v2/xml?method=getFirstArrivalToStop&KS_ID=${stopID}&os=android&clientid=test&authkey=${sha1(stopID+"just_f0r_tests")}`    
    let res = await fetch(URL)
                .then( response => response.text() ).then( str => {
                    let parser = new window.DOMParser();
                    return parser.parseFromString(str, "text/xml") 
                });
    console.log(res);
    res = res.getElementsByTagName("transport");
    //console.log(res);
    let innerElement = "";
    for (let i = 0; i < res.length; i++)//закидывать ссылочку сюда по hullNo каждого транспорта
    {
        innerElement += `<a href="route.html?hullNo=${res[i].getElementsByTagName("hullNo")[0].childNodes[0].nodeValue}">` + 
            res[i].getElementsByTagName("number")[0].childNodes[0].nodeValue + "  " + res[i].getElementsByTagName("type")[0].childNodes[0].nodeValue +   
            "<br/>" + res[i].getElementsByTagName("time")[0].childNodes[0].nodeValue + " Минут" + "<br/>" + "<hr/>"+  `</a>`;
        console.log(innerElement);
    }
    if (innerElement === "")
        innerElement = "<h3>Транспорт отсутствует</h3>";
    ListTransport.innerHTML = innerElement;
}

async function download()
{ 
    await load_stops_coord();
    StopName.innerHTML = getStopName(url_id);
    transportForecast(url_id);
}

download();