const axios = require('axios');
const cheerio = require('cheerio');

/*
  Scrapes schedule data from ssau.ru based on target type, id and week number
 */
async function parseSchedule(type, id, week) {
    const url = `https://ssau.ru/rasp?${type}Id=${id}&selectedWeek=${week}`;
    
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(data);
        
        let days = []; 
        const schedule = [];

        $('.schedule__head .schedule__item').each((i, el) => {
            const text = $(el).text().trim();
            if (i > 0 && text && text !== 'Время') days.push(text);
        });

        if (days.length === 0) days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        $('.schedule__time').each((i, timeEl) => {
            const timeText = $(timeEl).text().replace(/\s+/g, ' ').trim();
            const lessonsInRow = [];
            let currentCell = $(timeEl).next('.schedule__item');

            for (let d = 0; d < 6; d++) {
                const lessonNodes = currentCell.find('.schedule__lesson');
                
                if (lessonNodes.length > 0) {
                    const lessonsInCell = [];
                    lessonNodes.each((_, node) => {
                        const lesson = $(node);
                        const groupsList = [];
                        lesson.find('.schedule__group').each((_, g) => {
                            groupsList.push($(g).text().trim());
                        });

                        let subgroupInfo = "";
                        lesson.find('span').each((_, span) => {
                            const txt = $(span).text().trim();
                            if (txt.includes('Подгрупп')) subgroupInfo = txt;
                        });

                        lessonsInCell.push({
                            subject: lesson.find('.schedule__discipline').text().trim(),
                            type: lesson.find('.schedule__lesson-type-chip').text().trim(),
                            place: lesson.find('.schedule__place').text().trim(),
                            teacher: lesson.find('.schedule__teacher').text().trim(),
                            groups: groupsList.join(', '),
                            subgroup: subgroupInfo
                        });
                    });
                    lessonsInRow.push(lessonsInCell);
                } else {
                    lessonsInRow.push(null);
                }
                currentCell = currentCell.next('.schedule__item');
            }
            
            if (timeText) {
                schedule.push({ time: timeText, lessons: lessonsInRow });
            }
        });

        return { days, schedule, currentWeek: week };
    } catch (e) {
        return { error: true, days: [], schedule: [] };
    }
}

module.exports = { parseSchedule };