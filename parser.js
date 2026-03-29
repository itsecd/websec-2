const axios = require('axios');
const cheerio = require('cheerio');

async function parseGroup(groupName, groupId, weekNumber = 31) {
    let url = `https://ssau.ru/rasp?groupId=${groupId}`;
    if (weekNumber) {
        url += `&selectedWeek=${weekNumber}`;
    }
    
    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const scheduleItems = $('.schedule__items');
        
        if (scheduleItems.length === 0) {
            console.log('Контейнер .schedule__items не найден');
            return [];
        }

        const days = [];
        scheduleItems.find('.schedule__head:not(:has(.schedule__time-item))').each((i, el) => {
            const weekday = $(el).find('.schedule__head-weekday').text().trim();
            const date = $(el).find('.schedule__head-date').text().trim();
            if (weekday && date) {
                days.push({ weekday, date, index: i });
            }
        });
        
        const lessons = [];
        const timeBlocks = scheduleItems.find('.schedule__time');
        
        timeBlocks.each((timeBlockIndex, timeBlock) => {
            const $timeBlock = $(timeBlock);
            
            const timeItems = $timeBlock.find('.schedule__time-item');
            const timeRange = [];
            timeItems.each((i, timeEl) => {
                const timeText = $(timeEl).text().trim();
                const time = timeText.split(' ')[0];
                if (time) timeRange.push(time);
            });
            
            let timeInterval = '';
            if (timeRange.length === 2) {
                timeInterval = `${timeRange[0]}-${timeRange[1]}`;
            } else if (timeRange.length === 1) {
                timeInterval = timeRange[0];
            } else {
                timeInterval = timeRange.join(', ');
            }
            
            let nextElement = $timeBlock.next();
            let dayIndex = 0;
            
            while (nextElement.length && !nextElement.hasClass('schedule__time')) {
                if (nextElement.hasClass('schedule__item') && !nextElement.hasClass('schedule__head')) {
                    const $lesson = nextElement.find('.schedule__lesson');
                    
                    if ($lesson.length && dayIndex < days.length) {
                        const subject = $lesson.find('.schedule__discipline').text().trim();
                        if (subject) {
                            const type = $lesson.find('.schedule__lesson-type-chip').text().trim();
                            const place = $lesson.find('.schedule__place').text().trim();
                            
                            let teacherName = '';
                            let teacherId = '';
                            const teacherLink = $lesson.find('.schedule__teacher a');
                            if (teacherLink.length) {
                                teacherName = teacherLink.text().trim();
                                const href = teacherLink.attr('href');
                                const match = href && href.match(/staffId=(\d+)/);
                                if (match) teacherId = match[1];
                            } else {
                                teacherName = $lesson.find('.schedule__teacher').text().trim();
                            }
                            lessons.push({
                                lessonNumber: timeBlockIndex + 1,
                                title: subject,
                                type: type || 'Лекция',
                                groupId: groupId,
                                groupName: groupName,
                                date: days[dayIndex].date,
                                weekday: days[dayIndex].weekday,
                                time: timeInterval,
                                place: place || '-',
                                teacherId: teacherId,
                                teacherName: teacherName || '-'
                            });
                        }
                    }
                    dayIndex++;
                }
                nextElement = nextElement.next();
            }
        });
        lessons.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.lessonNumber - b.lessonNumber;
        });
        return lessons;

    } catch (err) {
        console.error(`Ошибка парсинга ${groupName}: ${err.message}`);
        return [];
    }
}
async function parseTeacher(teacherId, teacherName, weekNumber = null) {
    let url = `https://ssau.ru/rasp?staffId=${teacherId}`;
    if (weekNumber) {
        url += `&selectedWeek=${weekNumber}`;
    }

    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        const days = [];
        $('.schedule__head-date').each((i, el) => {
            const date = $(el).text().trim();
            if (date) days.push(date);
        });
        const times = [];
        $('.schedule__time-item').each((i, el) => {
            const timeText = $(el).text().trim();
            const time = timeText.split(' ')[0];
            if (time && !times.includes(time)) {
                times.push(time);
            }
        });
        const lessons = [];
        $('.schedule__lesson').each((i, lesson) => {
            const $lesson = $(lesson);
            const subject = $lesson.find('.schedule__discipline').text().trim();
            
            if (subject) {
                const dayIndex = Math.floor(i / times.length);
                const timeIndex = i % times.length;
                
                if (dayIndex < days.length && timeIndex < times.length) {
                    const groups = [];
                    $lesson.find('.schedule__groups a').each((j, groupEl) => {
                        const groupName = $(groupEl).text().trim();
                        if (groupName) groups.push(groupName);
                    });
                    
                    lessons.push({
                        title: subject,
                        type: $lesson.find('.schedule__lesson-type-chip').text().trim() || '-',
                        place: $lesson.find('.schedule__place').text().trim() || '-',
                        date: days[dayIndex],
                        time: times[timeIndex],
                        groups: groups.join(', ') || '-',
                        teacherName: teacherName || '-'
                    });
                }
            }
        });
        return lessons;

    } catch (err) {
        console.error(`Ошибка парсинга ${groupName}: ${err.message}`);
        return [];
    }
}

async function searchTeacher(query) {
    try {
        const url = `https://ssau.ru/rasp?search=${encodeURIComponent(query)}`;
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        let result = null;
        
        $('a[href*="staffId"]').each((i, el) => {
            const name = $(el).text().trim();
            const href = $(el).attr('href');
            const match = href && href.match(/staffId=(\d+)/);
            
            if (match && name.toLowerCase().includes(query.toLowerCase())) {
                result = { id: match[1], name: name };
                return false;
            }
        });
        
        return result;
    } catch (err) {
        console.error(`Ошибка парсинга ${groupName}: ${err.message}`);
        return [];
    }
}
module.exports = { parseGroup, parseTeacher, searchTeacher };