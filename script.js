
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

function getMatches(searchStr, str) {
    var ind = 0, searchStrL = searchStr.length;
    var index, matches = [];

    str = str.toLowerCase();
    searchStr = searchStr.toLowerCase();

    while ((index = str.indexOf(searchStr, ind)) > -1) {
         matches.push(index);
         ind = index + searchStrL;
    }
    return matches;
}

async function data_stops_coords()
{
    const data = await load_stops_coord();
    console.log(data);
    let size = data.getElementsByTagName("stop").length;
    let stop_data = data.getElementsByTagName("stop");
    let lst = new Array();
    console.log(stop_data);
    
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



let ab = data_stops_coords();
