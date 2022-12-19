const ListStops = document.querySelector("#stops-list");

var params = (new URL(document.location)).searchParams;
var hull = params.get("hullNo");

var LOADED_STOPS = null;

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


async function stops_next(hullNo) {
    let URL =`https://tosamara.ru/api/v2/xml?method=getTransportPosition&HULLNO=${hullNo}&os=android&clientid=test&authkey=${sha1(hullNo + "just_f0r_tests")}`    
    let res = await fetch(URL)
                .then( response => response.text() ).then( str => {
                    let parser = new window.DOMParser();
                    return parser.parseFromString(str, "text/xml") 
                });
    let innerElement = "";

    console.log(res.getElementsByTagName("nextStops")[0]);
    res = res.getElementsByTagName("nextStops")[0].getElementsByTagName("stop");
    
    console.log(res[0].getElementsByTagName("KS_ID")[0].textContent);
    console.log(res.length);
    let KS_ID = 0;
    for (let i = 0; i < res.length; i++)//закидывать ссылочку сюда по hullNo каждого транспорта
    {
        KS_ID = res[i].getElementsByTagName("KS_ID")[0].textContent;
        console.log(KS_ID);
        let nameKS = getStopName(KS_ID);
        innerElement += `<a href="stops.html?id=${KS_ID}">` + nameKS + "  " +
            "<br/>" + Math.ceil(res[i].getElementsByTagName("time")[0].textContent/60) + " минут(ы)" + "<br/>" + "<hr/>"+  `</a>`;
    }

    console.log(innerElement);

    if (innerElement === "")
        innerElement = "<h3>Остановки отсутствуют</h3>";
    ListStops.innerHTML = innerElement;
}


async function download()
{ 
    await load_stops_coord()
    //console.log(LOADED_STOPS);
    stops_next(hull);
}

download();