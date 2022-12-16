let institutions;
let groups;
let prevHtml = ' ';
let htmlString = ' ';
$(document).ready(function () {
	getInstitutions();
});

function getInstitutions() {
	$.ajax({
		url: 'https://localhost:7175/TimeTable/Faculties',
		method: 'get',
		dataType: 'html',
		success: function (data) {
			data = JSON.parse(data);
			if (data.success) {
				institutions = data.instDict;
				initInstitutions(institutions);
			}
			else {
				$("#mainDiv").html(data.text);
            }
		}
	});
};

function initInstitutions(institutions) {
	prevHtml = htmlString;
	htmlString = '<h2>Выберите институт</h2>\n';
	htmlString += '<table id="instTable">\n'
	for (let i = 0; i < Object.keys(institutions).length; i++) {
		htmlString += '<tr class="facRow">\n';
		htmlString += `<td class="instTd">\n<a href="/TimeTable/Faculty/${institutions[i].Value}&course=1">${institutions[i].Key}</a>\n</td>\n`;
		htmlString += '</tr>\n';
	}
	htmlString += '</table>\n';
	$("#mainDiv").html(htmlString);
};


