let groups;
let facultyId;
let globalCourse;
let prevHtml = ' ';
let htmlString = ' ';
$(document).ready(function () {
	InitPage();
});

function InitPage() {
	let partOfUrl = document.location.pathname;
	let searchStr = partOfUrl.split("/")[3];
	facultyId = searchStr.substring(0, 9);
	globalCourse = searchStr.substring(searchStr.length - 1, searchStr.length)
	$.ajax({
		url: `https://localhost:7175/TimeTable/GetGroupsByFacultyAndCourse/${facultyId}/${globalCourse}`,
		method: 'get',
		dataType: 'html',
		success: function (data) {
			data = JSON.parse(data);
			if (data.success) {
				let name = data.name;
				let dict = data.dict;
				groups = dict;
				let course = data.course;
				let courseCount = data.courseCount;
				initCoursesTable(course, courseCount);
				InitGroups(name, dict, course, courseCount);
			}
			else {
				$("#mainDiv").html(data.text);
			}
		}
	});
};

function InitGroups(name, dict, course, courseCount) {
	prevHtml = htmlString;
	$("#facultyName").html(`${name}`);
	initCoursesTable(course, courseCount);
	initGroupsTable(dict);
}

function initCoursesTable(course, courseCount) {
	htmlString = `<div class="courseDiv">`
	htmlString += `<table id="courses" class="courseTable">`
	htmlString += `<tr>`
	for (let i = 1; i < courseCount + 1; i++) {
		htmlString += `<td>`
		if (i == course) {
			htmlString += `<a style="font-size: 16px;" href="#">${i} курс</a>`;
		}
		else {
			htmlString += `<a style="font-size: 12px;" href="/TimeTable/Faculty/${facultyId}&course=${i}">${i} курс</a>`
		}
		htmlString += `</td>`
	}
	htmlString += `</tr>`
	htmlString += `</table>`
	htmlString += `</div>`
	$("#courses").html(htmlString);
}

function initGroupsTable(dict) {
	htmlString = '';
	for (const [key, value] of Object.entries(dict)) {
		htmlString += `<h3>${key}</h3>`;
		let subdict = dict[key];
		let j = 0;
		for (const [key1, value1] of Object.entries(subdict)) {
			htmlString += `<hr>`;
			htmlString += `<div class="typeDiv">`
			htmlString += `<h4>${key1}</h4>`;
			htmlString += `<table id="groupTable${j++}" class="GroupsTable">\n`;
			let subsubdict = subdict[key1];
			let len = Object.keys(subsubdict).length;
			let keys = Object.keys(subsubdict);
			let values = Object.values(subsubdict);
			for (let k = 0; k < len; k += 4) {
				htmlString += '<tr>\n';
				if (k < len) {
					htmlString += `<td><a href="/TimeTable/Group/${values[k]}&week=current">${keys[k]}</a></td>`;
				}
				else {
					continue;
				}
				if (k + 1 < len) {
					htmlString += `<td><a href="/TimeTable/Group/${values[k + 1]}&week=current">${keys[k + 1]}</a></td>`;
				}
				else {
					continue;
				}
				if (k + 2 < len) {
					htmlString += `<td><a href="/TimeTable/Group/${values[k + 2]}&week=current">${keys[k + 2]}</a></td>`;
				}
				else {
					continue;
				}
				if (k + 3 < len) {
					htmlString += `<td><a href="/TimeTable/Group/${values[k + 3]}&week=current">${keys[k + 3]}</a></td>`;
				}
				else {
					continue;
				}
				htmlString += '</tr>\n';
			}
			htmlString += '</table>\n';
			htmlString += `</div>`;
		}
	}
	$("#groups").html(htmlString);
}
