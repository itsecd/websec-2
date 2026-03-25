const express = require('express');
const fs = require('fs');
const HTMLParser = require('node-html-parser');
const XMLHttpRequest = require('xhr2');
const app = express();
const PORT = 5000;

const groupsData = fs.readFileSync('groups.json', 'utf8');
const teachers = JSON.parse(fs.readFileSync('teachers.json', 'utf8'));
const schedule = JSON.parse(fs.readFileSync('timetable.json', 'utf8'));

groups = JSON.parse(groupsData);

app.use(express.static('client'));

app.get('/teacherRasp', (req, res) => {
    let teacherId = req.query.teacherId;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;

    let filtered = schedule.filter(item => item.teacherId === teacherId);

    if (startDate) {
        filtered = filtered.filter(item => item.date >= startDate);}
    if (endDate) {
        filtered = filtered.filter(item => item.date <= endDate);}

    filtered.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    res.json({
        success: true,
        teacherId: teacherId,
        teacherName: teachers[teacherId],
        count: filtered.length,
        schedule: filtered
    });

})

app.get('/groupRasp', (req, res) => { // api эндпоинт

    let userId = req.query.groupId;
    let startDate = req.query.startDate;
    let endDate = req.query.endDate;

    if (groups[userId]) {
        groupId = groups[userId];
    }
    //const url = `https://ssau.ru/rasp?groupId=${groupId}`;

    let filtered = schedule.filter(item => item.groupId === groupId);
    
    if (startDate) {
        filtered = filtered.filter(item => item.date >= startDate);}
    if (endDate) {
        filtered = filtered.filter(item => item.date <= endDate);}

    filtered.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    res.json({
        success: true,
        groupId: groupId,
        groupName: userId,
        count: filtered.length,
        schedule: filtered
    });
});

app.get('/search', (req, res) => {
    const query =req.query.q.trim();

    if (groups[query]) {
        return res.json({
            type: 'group',
            id: groups[query],
            name: query})
    }

    for (const[id, name] of Object.entries(teachers)) {
         if (name && name.toLowerCase().includes(query.toLowerCase())) {
            return res.json({
                type: 'teacher',
                id: id,
                name: name
            });
        }
    }

    res.status(404).json({ 
        success: false,
        error: 'Ничего не найдено' 
    });

});

app.listen(PORT, () => {
    console.log('Адерс сервера  http://localhost:5000')
})

