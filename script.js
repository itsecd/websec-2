var LOADED_STOPS = null;
const ListInputElement = document.querySelector("#input-list");
const InputElement = document.querySelector("#search_text");

async function data_stops(name_stop)
{
    const data = await load_stops();
    console.log(data);
    let size = data.getElementsByTagName("stop").length;
    let stop_data = data.getElementsByTagName("stop");
    let lst = new Array();
    console.log(stop_data[0].childNodes[1].textContent);
    
    for (let i = 0; i < size; i++)
    {
        if (stop_data[i].childNodes[1].textContent == name_stop) {
            lst.push(data[i]);
        }
    }
    
    if (lst.size === 0)
    {
        lst = "No Matches";
    }
}

async function load_stops_coord (){
    if (LOADED_STOPS)
        return LOADED_STOPS;
    let url = "https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml";
    try {
        let res = await fetch(url).then( response => response.text() ).then( str => {
            let parser = new window.DOMParser();
            return parser.parseFromString(str, "text/xml") 
            });
        LOADED_STOPS = res;
        return res;
    }
    catch(err) { console.log('err:', err); }
}

async function get_markers()
{
    await load_stops_coord();
    let stops_data = LOADED_STOPS.getElementsByTagName("stop");
    let size = LOADED_STOPS.getElementsByTagName("stop").length;
    for (let i = 0; i < size; i++)
    {
        try{
            var popup = new maplibregl.Popup({ offset: 25 }).setHTML(
                `<a href="stops.html?id=${stops_data[i].getElementsByTagName("KS_ID")[0].childNodes[0].nodeValue}">` + 
                stops_data[i].getElementsByTagName("title")[0].childNodes[0].nodeValue + "<br/> " + stops_data[i].getElementsByTagName("adjacentStreet")[0].childNodes[0].nodeValue 
                + "\t " + stops_data[i].getElementsByTagName("direction")[0].childNodes[0].nodeValue + `</a>`
            );
        }
        catch (err)
        {
            var popup = new maplibregl.Popup({ offset: 25 }).setHTML(
                `<a href="stops.html?id=${stops_data[i].getElementsByTagName("KS_ID")[0].childNodes[0].nodeValue}">` + 
                stops_data[i].getElementsByTagName("title")[0].childNodes[0].nodeValue + `</a>`
            );
        }

        // create DOM element for the marker
        var el = document.createElement('div');
        el.id = 'marker';
        
        let latitude = stops_data[i].getElementsByTagName("latitude")[0].childNodes[0].nodeValue;
        let longitude = stops_data[i].getElementsByTagName("longitude")[0].childNodes[0].nodeValue;
        // create the marker
        new maplibregl.Marker(el)
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map);
    }
}

function filterFunction() {
    var input, filter, a, i;
    loadDataInput(LOADED_STOPS, ListInputElement);
    input = document.getElementById("search_text");
    filter = input.value.toUpperCase();
    div = document.getElementById("input-list");
    a = div.getElementsByTagName("a");
    for (i = 0; i < a.length; i++) {
            txtValue = a[i].textContent || a[i].innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                a[i].style.display = "";
            } else {
                a[i].style.display = "none";
        }
    }
}

function loadDataInput(data, element) {
    if(data) {
        let innerElement = "";
        let stops_data = data.getElementsByTagName("stop");
        for(let i = 0; i < stops_data.length; i++)
        {
            try
            {
                innerElement += `<a href="stops.html?id=${stops_data[i].getElementsByTagName("KS_ID")[0].childNodes[0].nodeValue}">` +
                stops_data[i].getElementsByTagName("title")[0].childNodes[0].nodeValue +"<br/> "+ 
                stops_data[i].getElementsByTagName("direction")[0].childNodes[0].nodeValue
                + "<br/>" + "<hr/>"+  `</a>`;
            }
            catch(err)
            {
                innerElement += `<a href="stops.html?id=${stops_data[i].getElementsByTagName("KS_ID")[0].childNodes[0].nodeValue}">` +
                stops_data[i].getElementsByTagName("title")[0].childNodes[0].nodeValue +"<br/> "+ `</a>`;
            }
        }
        element.innerHTML = innerElement;
    }
}


InputElement.addEventListener("input", function() {
    if (InputElement.value === "")
        ListInputElement.innerHTML = "";
    else
        filterFunction();
});

