const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/api/schedule', async (req, res) => {
    try {
        const { groupId, staffId, selectedWeek } = req.query;

        if (!groupId && !staffId) {
            return res.status(400).json({ error: 'Укажите groupId или staffId' });
        }

        let url;
        if (groupId) {
            url = `https://ssau.ru/rasp?groupId=${groupId}`;
            if (selectedWeek) url += `&selectedWeek=${selectedWeek}`;
        } else {
            url = `https://ssau.ru/rasp?staffId=${staffId}`;
            if (selectedWeek) url += `&selectedWeek=${selectedWeek}`;
        }

        console.log(`Запрос к ssau.ru: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://ssau.ru/'
            },
            timeout: 15000
        });

        const html = response.data;
        const schedule = parseScheduleHTML(html, { groupId, staffId, week: selectedWeek });

        res.json(schedule);
    } catch (error) {
        console.error('Ошибка в /api/schedule:', error.message);
        res.status(500).json({ error: error.message });
    }
});

function parseScheduleHTML(html, params) {
    const $ = cheerio.load(html);
    
    let groupOrTeacher = '';
    if (params.groupId) {
        groupOrTeacher = extractGroupName($);
    } else {
        groupOrTeacher = extractTeacherName($);
    }
    
    const speciality = extractSpeciality($);
    const weekNumber = params.week || extractCurrentWeek($);
    const daysSchedule = extractDaysSchedule($);
    
    return {
        group: groupOrTeacher,
        specialty: speciality,
        weekNumber: weekNumber,
        daysSchedule: daysSchedule
    };
}

function extractGroupName($) {
    const groupElement = $('.h2-text.info-block__title');
    return groupElement.length ? groupElement.text().trim() : '';
}

function extractTeacherName($) {
    const teacherElement = $('.h2-text.info-block__title');
    return teacherElement.length ? teacherElement.text().trim() : '';
}

function extractSpeciality($) {
    const container = $('.body-text.info-block__description');
    if (container.length) {
        const firstDiv = container.find('div').first();
        return firstDiv.text().trim();
    }
    return '';
}

function extractCurrentWeek($) {
    const weekElement = $('.h3-text.week-nav-current_week');
    if (weekElement.length) {
        const text = weekElement.text().trim();
        const match = text.match(/\d+/);
        return match ? match[0] : '';
    }
    return '';
}

function extractDaysSchedule($) {
    const daysSchedule = [];
    
    const $heads = $('.schedule__item.schedule__head');
    if ($heads.length === 0) return [];
    
    for (let i = 1; i < $heads.length; i++) {
        const $head = $($heads[i]);
        const dayOfWeek = $head.find('.schedule__head-weekday').text().trim();
        const date = $head.find('.caption-text.schedule__head-date').text().trim();
        daysSchedule.push({ dayOfWeek, date, timeSlots: [] });
    }
    
    const $timeElements = $('.schedule__time');
    const $itemElements = $('.schedule__item:not(.schedule__head)');
    
    const timeArray = $timeElements.toArray();
    const itemArray = $itemElements.toArray();
    
    let itemIndex = 0;
    
    for (let t = 0; t < timeArray.length; t++) {
        const $timeEl = $(timeArray[t]);
        
        let timeRange = '';
        const $timeItems = $timeEl.find('.schedule__time-item');
        if ($timeItems.length >= 2) {
            const start = $timeItems.eq(0).text().trim();
            const end = $timeItems.eq(1).text().trim();
            if (start && end) timeRange = start + '-' + end;
        } else {
            timeRange = $timeEl.text().trim();
        }
        
        if (!timeRange) continue;
        
        if (itemIndex + 6 > itemArray.length) break;
        
        for (let dayIdx = 0; dayIdx < daysSchedule.length && dayIdx < 6; dayIdx++) {
            const $cell = $(itemArray[itemIndex + dayIdx]);
            
            const $lessons = $cell.find('.schedule__lesson');
            
            $lessons.each(function() {
                const $lesson = $(this);
                
                const subject = $lesson.find('.schedule__discipline').text().trim();
                const type = $lesson.find('.schedule__lesson-type').text().trim();
                const room = $lesson.find('.schedule__place').text().trim();
                
                const $teacherLink = $lesson.find('.schedule__teacher a');
                let teacherName = $teacherLink.text().trim();
                if (!teacherName) {
                    teacherName = $lesson.find('.schedule__teacher').text().trim();
                }
                const teacherHref = $teacherLink.attr('href');
                let teacherId = null;
                if (teacherHref) {
                    const match = teacherHref.match(/staffId=(\d+)/);
                    if (match) {
                        teacherId = match[1];
                    }
                }
                
                const groups = [];
                let $groupsContainer = $lesson.find('.schedule__groups');
                if ($groupsContainer.length === 0) {
                    $groupsContainer = $lesson.find('.schedule__lesson-info');
                }
                
                $groupsContainer.find('a.caption-text.schedule__group').each(function() {
                    const $a = $(this);
                    const href = $a.attr('href');
                    let groupId = null;
                    if (href) {
                        const groupMatch = href.match(/groupId=(\d+)/);
                        if (groupMatch) {
                            groupId = groupMatch[1];
                        }
                    }
                    groups.push({
                        groupNumber: $a.text().trim(),
                        groupId: groupId
                    });
                });
                
                if (groups.length === 0) {
                    const subgroupText = $groupsContainer.find('.caption-text').text().trim();
                    if (subgroupText) {
                        groups.push({ groupNumber: subgroupText, groupId: null });
                    }
                }
                
                const teacher = { teacherName: teacherName, teacherId: teacherId };
                
                if (subject) {
                    daysSchedule[dayIdx].timeSlots.push({
                        timeRange: timeRange,
                        type: type,
                        subject: subject,
                        room: room,
                        groups: groups,
                        teacher: teacher
                    });
                }
            });
        }
        
        itemIndex += 6;
    }
    
    console.log('[Отладка] Обработано слотов: ' + daysSchedule.reduce(function(sum, day) { return sum + day.timeSlots.length; }, 0));
    
    return daysSchedule;
}

app.listen(port, function() {
    console.log('Сервер запущен: http://localhost:' + port);
});