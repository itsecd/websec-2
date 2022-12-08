
async function load_stops (){
    let url = "https://tosamara.ru/api/v2/classifiers/stops.xml";
    try {
        let res = await fetch(url).then( response => response.text() ).then( str => {
            let parser = new window.DOMParser();
            return parser.parseFromString(str, "text/xml") 
            });
        return res;
    }
    catch(err) { console.log('err:', err); }
}


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
    let url = "https://tosamara.ru/api/v2/classifiers/stopsFullDB.xml";
    try {
        let res = await fetch(url).then( response => response.text() ).then( str => {
            let parser = new window.DOMParser();
            return parser.parseFromString(str, "text/xml") 
            });
        return res;
    }
    catch(err) { console.log('err:', err); }
}

//спросить здесь, был в параметре список
async function getMatches(searchStr) {
    console.log("зашел");
    const data = await load_stops_coord();
    
    let stops_data = data.getElementsByTagName("stop");
    
    var index, matches = [];

    searchStr = searchStr.toLowerCase();

    for(let i = 0; i < stops_data.length; i++)
    {
        str = stops_data[i].getElementsByTagName("title")[0].childNodes[0].nodeValue;
        str = str.toLowerCase();
        //console.log(stops_data[i].getElementsByTagName("KS_ID")[0].childNodes[0].nodeValue);
        if ((index = str.indexOf(searchStr)) > -1) {
            console.log(stops_data[i]);
            matches.push(stops_data[i]);
        }
    }
    console.log(matches);
    return matches;
}

async function getMatchesInput()
{
    var val = document.getElementById('search_text').value;
    let data = await getMatches(val);
    console.log(data);
}


async function data_stops_coords()
{
    const data = await load_stops_coord();
    console.log(data);
    let size = data.getElementsByTagName("stop").length;
    let stop_data = data.getElementsByTagName("stop");
    console.log(stop_data.length)
    
    //let lst = new Array();
    //console.log(name);
    console.log(stop_data);

    
    return stop_data
}

async function get_markers()
{
    
    const data = await load_stops_coord();
    let stops_data = data.getElementsByTagName("stop");
    console.log(data);
    let size = data.getElementsByTagName("stop").length;
    
    for (let i = 0; i < size; i++)
    {
        var popup = new maplibregl.Popup({ offset: 25 }).setText(
            stops_data[i].getElementsByTagName("title")[0].childNodes[0].nodeValue + "\t " + stops_data[i].getElementsByTagName("adjacentStreet")[0].childNodes[0].nodeValue 
            + "\t " + stops_data[i].getElementsByTagName("direction")[0].childNodes[0].nodeValue
        );
        
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

//let ab = data_stops_coords();
//let ss = getMatches("гагарина");