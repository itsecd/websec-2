const express = require('express');
const fs = require('fs');
const app=express();
const PORT =5000;

const groupsData = fs.readFileSync('groups.json', 'utf8');
groups = JSON.parse(groupsData);

app.use(express.static('client'));

app.get('/rasp', (req, res) => { // api эндпоинт

    let groupId = req.query.groupId;

    if (groups[groupId]) {
        groupId=groups[groupId];
    }
    const url = `https://ssau.ru/rasp?groupId=${groupId}`;

    res.json({
        success: true, 
        groupId: groupId, 
        dates: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']  
    });
});



app.listen(PORT, ()=> {
    console.log('Адерс сервера  http://localhost:5000')
})

