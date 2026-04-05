const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function parseSchedule(html) {
    const $ = cheerio.load(html);
    
    const days = [];
    $('.schedule__head-weekday').each((i, el) => days.push($(el).text().trim()));
    
    const dates = [];
    $('.schedule__head-date').each((i, el) => dates.push($(el).text().trim()));
    
    const timeSlots = [];
    $('.schedule__time').each((i, el) => {
        const items = $(el).find('.schedule__time-item');
        if (items.length >= 2) {
            const start = items.eq(0).text().trim().split(' ')[0];
            const end = items.eq(1).text().trim().split(' ')[0];
            timeSlots.push(`${start}–${end}`);
        } else {
            timeSlots.push($(el).text().trim());
        }
    });
    
    const matrix = [];
    const children = $('.schedule__items').children();
    let timeIndex = 0;
    
    for (let i = 0; i < children.length; i++) {
        const child = children.eq(i);
        if (child.hasClass('schedule__time')) {
            const currentTime = timeSlots[timeIndex] || '';
            const cells = [];
            
            for (let d = 0; d < days.length; d++) {
                const cell = children.eq(i + 1 + d);
                const lessons = [];
                
                if (cell.length && (cell.hasClass('schedule__item') || cell.hasClass('schedule__item_show'))) {
                    cell.find('.schedule__lesson-wrapper').each((idx, el) => {
                        const lesson = $(el);
                        const subject = lesson.find('.schedule__discipline').text().trim();
                        if (subject) {
                            const place = lesson.find('.schedule__place').text().trim();
                            const teacher = lesson.find('.schedule__teacher a').text().trim();
                            const type = lesson.find('.schedule__lesson-type-chip').text().trim();
                            let groupsInfo = '';
                            const groupsElem = lesson.find('.schedule__groups');
                            if (groupsElem.length) {
                                const groupLinks = groupsElem.find('a');
                                if (groupLinks.length) {
                                    groupsInfo = groupLinks.map((idx, el) => $(el).text().trim()).get().join(', ');
                                } else {
                                    groupsInfo = groupsElem.text().trim();
                                }
                            }
                            lessons.push({ subject, place, teacher, type, groupsInfo });
                        }
                    });
                }
                cells.push(lessons);
            }
            
            matrix.push({ time: currentTime, cells: cells });
            i += days.length;
            timeIndex++;
        }
    }
    
    return { days, dates, scheduleMatrix: matrix };
}

app.get('/api/schedule', async (req, res) => {
    const { groupId, week = '32' } = req.query;
    if (!groupId) return res.status(400).json({ error: 'Не указана группа' });
    
    const url = `https://ssau.ru/rasp?groupId=${groupId}&selectedWeek=${week}`;
    console.log(`Группа: ${url}`);
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const data = parseSchedule(response.data);
        res.json({ groupId, week, ...data });
    } catch (error) {
        console.error('Ошибка группы:', error.message);
        res.status(500).json({ error: 'Не удалось загрузить расписание группы' });
    }
});

app.get('/api/teacher-schedule', async (req, res) => {
    const { staffId, week = '32' } = req.query;
    if (!staffId) return res.status(400).json({ error: 'Не указан ID преподавателя' });
    
    const url = `https://ssau.ru/rasp?staffId=${staffId}&selectedWeek=${week}`;
    console.log(`Преподаватель: ${url}`);
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const data = parseSchedule(response.data);
        res.json({ staffId, week, ...data });
    } catch (error) {
        console.error('Ошибка преподавателя:', error.message);
        res.status(500).json({ error: 'Не удалось загрузить расписание преподавателя' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:3000`);
});