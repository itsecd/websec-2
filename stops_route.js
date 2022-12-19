const ListTransport = document.querySelector("#transport-list");

var params = (new URL(document.location)).searchParams;
var url_id = params.get("id");


async function transportForecast(stopID) {
    let URL = `https://tosamara.ru/api/v2/xml?method=getFirstArrivalToStop&KS_ID=${stopID}&os=android&clientid=test&authkey=${sha1(stopID+"just_f0r_tests")}`    
    let res = await fetch(URL)
                .then( response => response.text() ).then( str => {
                    let parser = new window.DOMParser();
                    return parser.parseFromString(str, "text/xml") 
                });
    
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

transportForecast(url_id);