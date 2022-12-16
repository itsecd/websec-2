let htmlString = ' ';
let teacherId;
let timeTable;
let winWidth = $(window).width();
$(document).ready(function () {
	InitPage();
	$(window).on('resize', function () {
		let currentWidth = $(this).width();
		if (currentWidth <= 765) { InitTeacher(timeTable, true, new Date().getDay() - 1) }
		if (currentWidth > 765) { InitTeacher(timeTable, false, new Date().getDay() - 1) }
		winWidth = $(this).width();
	});
});

function InitPage() {
	let partOfUrl = document.location.pathname;
	let searchStr = partOfUrl.split("/")[3];
	teacherId = searchStr.substring(0, 9);
	let strWeek = searchStr.substring(searchStr.length - 3);
	let week = (isNaN(parseInt(strWeek.match(/\d+/))) ? "current" : parseInt(strWeek.match(/\d+/)));
	$.ajax({
		url: `https://localhost:7175/TimeTable/GetTeacherTimeTable/${teacherId}&week=${week}`,
		method: 'get',
		dataType: 'html',
		success: function (data) {
			data = JSON.parse(data);
			if (data.success) {
				timeTable = data;
				InitTeacher(data, $(window).width() <= 765 ? true : false, new Date().getDay() - 1);
			}
			else {
				$("#TimeTableDiv").html(data.text);
            }
		}
	});
};

function InitTeacher(resp, isMobile, day) {
	if (!day && day != 0) {
		return;
	}
	if (day == 6) {
		day = 5;
	}
	let name = resp.inTeacherName;
	$("#teacherName").html(name);
	htmlString = `<tr class="weekRow">`;
	htmlString += `<td class="usually week"><a style="color: white" href="https://localhost:7175/TimeTable/Teacher/${teacherId}&week=${parseInt(resp.inPrevWeek.substring(0, 3))}">${resp.inPrevWeek.substring(0, 3)}</a></td>`;
	htmlString += `<td class="usually week" colspan="5">${resp.inCurWeek}</td>`;
	htmlString += `<td class="usually week"><a style="color: white" href="https://localhost:7175/TimeTable/Teacher/${teacherId}&week=${parseInt(resp.inNextWeek.substring(0, 3))}">${resp.inNextWeek.substring(0, 3)}</a></td>`;
	htmlString += `</tr>`;
	if (!isMobile) {
		let subjects = resp.inSubjects;
		htmlString += `<tr>`;
		htmlString += `<th>Время</th>`;
		for (let i = 0; i < Object.keys(resp.inWeekDayNames).length; i++) {
			htmlString += `<th>${resp.inWeekDayNames[i]}</br>${resp.inWeekDayDates[i]}</th>`;
		}
		htmlString += `</tr>`;
		htmlString += `<tr>`;
		for (let s = 5, ss = 0; s < subjects.length; s += 6, ss += 1) {
			htmlString += `<td class="usually">${resp.inTimes[ss]}</td>`;
			fillRow(subjects, s - 5, s + 1);
		}
		htmlString += `</tr>`
		htmlString += `</table>`
	}
	else {
		let subjects = resp.inSubjects;
		let nextDay = day + 1 == 6 ? null : day + 1;
		let prevDay = day - 1 == -1 ? null : day - 1;
		dayTimeTable = [];
		for (let sI = day; sI < subjects.length; sI += 6) {
			dayTimeTable.push(subjects[sI]);
		}
		htmlString = `<tr class="weekRow">`;
		htmlString += `<td class="usually week"><a style="color: white" href="https://localhost:7175/TimeTable/Teacher/${teacherId}&week=${parseInt(resp.inPrevWeek.substring(0, 3))}">${resp.inPrevWeek.substring(0, 3)}</a></td>`;
		htmlString += `<td colspan="${isMobile ? 0 : 5}" class="usually week">${resp.inCurWeek}</td>`;
		htmlString += `<td class="usually week"><a style="color: white" href="https://localhost:7175/TimeTable/Teacher/${teacherId}&week=${parseInt(resp.inNextWeek.substring(0, 3))}">${resp.inNextWeek.substring(0, 3)}</a></td>`;
		htmlString += `</tr>`;
		htmlString += `<tr>`;
		if (prevDay || prevDay == 0) {
			htmlString += `<td class="usually day" id="prev${prevDay}"><input type="image" class="icon" src="/images/prevArrow.png" onclick="InitTeacher(timeTable, true, ${prevDay})"/></td>`;
		}
		else {
			htmlString += `<td class="usually day"></td>`;
		}
		htmlString += `<td class="usually day">${resp.inWeekDayNames[day]}</td>`;
		if (nextDay) {
			htmlString += `<td class="usually day" id="next${nextDay}"><input type="image" class="icon" src="/images/nextArrow.png" onclick="InitTeacher(timeTable, true, ${nextDay})"/></td>`;
		}
		else {
			htmlString += `<td class="usually day"></td>`;
		}
		htmlString += `</tr>`;
		for (let i = 0; i < dayTimeTable.length; i++) {
			htmlString += `<tr>`;
			fillCell(dayTimeTable[i], true, resp.inTimes[i]);
			htmlString += `<tr>`;
		}
		htmlString += `</table>`
	}
	$("#timeTable").html(htmlString);
	
}

function fillRow(subjects, offset, ogr) {
	for (let j = offset; j < ogr; j++) {
		fillCell(subjects[j], false);
		if ((j + 1) % 6 == 0) {
			if (j == 0) {
				continue;
			}
			htmlString += `</tr><tr>`
		}
	}
}

function fillCell(subject, isMobile, time) {
	let colSpanAttr = isMobile ? 'colspan="2" ' : '';
	let brTags = isMobile ? '</br>' : '</br></br>';
	if (subject == null || (subject != null && subject[0] == null)) {
		htmlString += time != null ? `<td class="table-item usually">${time}</td>` : '';
		htmlString += `<td ${colSpanAttr}class="table-item usually"></td>`;
	}
	else {
		let colorCSS = subject[0].Color == 1 ? "green" : subject[0].Color == 2 ? "blue" : subject[0].Color == 3 ? "red" : subject[0].Color == 4 ? "yellow" : "usually"
		if (subject.length == 1) {
			htmlString += time != null ? `<td class="table-item usually">${time}</td>` : '';
			htmlString += `<td ${colSpanAttr}class="table-item ${colorCSS}">`;
			htmlString += `<div>`
			htmlString += `${subject[0].Name}${brTags}`;
			htmlString += `${subject[0].Place}${brTags}`;
			htmlString += `<a href="https://localhost:7175/TimeTable/Group/${subject[0].GroupIds[0]}">${subject[0].Groups[0]}</a></br>`;
			htmlString += `</div>`
			htmlString += `</td>`;
		}
		else {
			htmlString += `<td td class="${colorCSS}">`;
			for (let k = 0; k < subject.length; k++) {
				htmlString += `<div>`
				htmlString += `${subject[k].Name}${brTags}`;
				htmlString += `${subject[k].Place}${brTags}`;
				htmlString += `<a href="https://localhost:7175/TimeTable/Group/${subject[k].GroupIds[0]}">${subject[k].Groups[0]}</a></br>`;
				htmlString += `</div>`
			}
			htmlString += `</td>`;
		}
    }
}