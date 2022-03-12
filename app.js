var express = require('express');
var mqtt = require('mqtt');
var mysql = require('mysql2');
var { createServer } = require('http');
var { Server } = require('socket.io');
const { time } = require('console');
var app = express();
var port = 8888;

app.use(express.static('public'));
app.set('views engine', 'ejs');
app.set('views', './views');

//cap nhat du lieu gan nhat tu database
app.get('/', function (req, res) {
	con.query(
		'SELECT cast(date as char(10)) as date, cast(date as time) as time,humidity,temperature,light,redled,greenled,blueled FROM iot_database.sensors ORDER BY id desc LIMIT 1',
		function (err, result) {
			res.render('home.ejs', { data: result[0] });
		}
	);
});

app.get('/history', async function (req, res) {
	let page = req.query.page || 1;
	let perPage = 20;
	let offset = (page - 1) * perPage;
	let query = `SELECT id,cast(date as char(20)) as date ,temperature,humidity, light FROM sensors order by id desc LIMIT ${perPage} OFFSET ${offset}`;
	con.query('SELECT COUNT(id) as COUNT FROM sensors', function (err, result) {
		let pages = Math.ceil(result[0].COUNT / perPage);
		con.query(query, function (err, data) {
			res.render('history.ejs', { pages: pages, current: page, data: data });
		});
	});
});

var httpServer = createServer(app);

var io = new Server(httpServer);
httpServer.listen(port);

// SQL--------Temporarily use PHPMyAdmin------------------------------
var con = mysql.createConnection({
	host: 'localhost',
	port: 3306,
	user: 'root',
	password: '123456',
	database: 'iot_database',
});
//---------------------------------------------CREATE TABLE-------------------------------------------------
con.connect(function (err) {
	if (err) throw err;
	console.log('mysql connected');

	var sql = `CREATE TABLE IF NOT EXISTS sensors (
            id INT(11) AUTO_INCREMENT PRIMARY KEY,
            date DATETIME, 
            humidity INT(3), 
            temperature INT(3),
            light INT(3),
            redled VARCHAR(3),
            greenled VARCHAR(3),
			blueled	VARCHAR(3)
        )`;
	con.query(sql, function (err) {
		if (err) throw err;
		console.log('Table created');
	});
});

//----------------------MQTT-------------------------
var options = {
	host: 'broker.emqx.io',
	port: 8883,
	protocol: 'mqtts',
	username: '',
	password: '',
};

var msg;
var client = mqtt.connect(options);
var topicSensor = 'esp8266-iot/sensor';
var topicLEDRed = 'esp8266-iot/led-red';
var topicLEDGreen = 'esp8266-iot/led-green';
var topicLEDBlue = 'esp8266-iot/led-blue';

client.subscribe(topicSensor);
client.subscribe(topicLEDRed);
client.subscribe(topicLEDGreen);
client.subscribe(topicLEDBlue);
//-------------------------------------------------------
io.on('connection', (socket) => {
	console.log(socket.id);
	console.log('a user connected');
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
	// nhan du lieu led tu client va gui yeu cau qua MQTT
	socket.on('changeLedState', function ({ ledName, state }) {
		let topicLedName;
		switch (ledName) {
			case 'redled':
				topicLedName = topicLEDRed;
				break;
			case 'greenled':
				topicLedName = topicLEDGreen;
				break;
			case 'blueled':
				topicLedName = topicLEDBlue;
				break;
		}
		if (state == 'on') {
			client.publish(topicLedName, 'on');
			console.log(topicLedName + ' on');
		} else {
			client.publish(topicLedName, 'off');
			console.log(topicLedName + ' off');
		}
	});
	socket.on('laygio', function () {
		var sqlDataDayHour =
			'Select TABLEDATA.day ,TABLEDATA.hour, avg(humidity) as humidity , avg(temperature) as temperature, avg(light)   as light  from (Select id,date,EXTRACT(hour from date) as hour,EXTRACT(day from date) as day,humidity,temperature,light from sensors where 	 EXTRACT(MONTH from date ) = EXTRACT(MONTH  from sysdate()) and 	EXTRACT(year From date) = EXTRACT(year FROM sysdate())) as TABLEDATA GROUP BY  TABLEDATA.HOUR,TABLEDATA.day';
		con.query(sqlDataDayHour, function (err, result) {
			socket.emit('tragio', result);
		});
	});
	socket.on('layngay', function () {
		var sqlDataDay =
			'Select TABLEDATA.day ,TABLEDATA.hour, avg(humidity) as humidity , avg(temperature) as temperature, avg(light)   as light   from (Select id,date,EXTRACT(day from date) as day, EXTRACT(hour from date) as hour,humidity,temperature,light from sensors where EXTRACT(MONTH from date ) = EXTRACT(MONTH  from sysdate()) and 	EXTRACT(year From date) = EXTRACT(year FROM sysdate()) ) as TABLEDATA GROUP BY  TABLEDATA.day';
		con.query(sqlDataDay, function (err, result) {
			socket.emit('trangay', result);
		});
	});
});
// ('Select id,date ,TABLEDATA.day ,TABLEDATA.hour, avg(humidity) as humidity , avg(temperature) as temperature, avg(light)   as light  from (Select id,date,EXTRACT(hour from date) as hour,EXTRACT(day from date) as day,humidity,temperature,light from sensors where 	-- EXTRACT(day from date ) = EXTRACT(day from sysdate()) EXTRACT(MONTH from date ) = EXTRACT(MONTH  from sysdate()) and 	EXTRACT(year From date) = EXTRACT(year FROM sysdate()) ) as TABLEDATA GROUP BY  TABLEDATA.HOUR');
//setup the callbacks
client.on('connect', function () {
	console.log('Connected');
});

client.on('error', function (error) {
	console.log(error);
});

client.on('message', function (topic, message) {
	//Called each time a message is received
	//console.log('Received message:', topic, message.toString());
	msg = message;
	if (topic == topicSensor) {
		io.emit('sensor', msg.toString());
		const objData = JSON.parse(msg.toString());
		var newDate = objData.date;
		var newHumidity = objData.humidity;
		var newTemp = objData.temperature;
		var newLight = objData.light;
		var newRedled = objData.redled;
		var newGreenled = objData.greenled;
		var newBlueled = objData.blueled;
		let date = newDate.split('T')[0];
		let time = newDate.split('T')[1].split('Z')[0];
		let Date_and_Time = date + ' ' + time;
		var sql = `INSERT INTO sensors (date, humidity, temperature, light, redled, greenled, blueled)
			VALUES ("${Date_and_Time}",${newHumidity},${newTemp},${newLight},'${newRedled}','${newGreenled}','${newBlueled}')`;
		con.query(sql, function (err) {
			if (err) throw err;
			//	console.log('Table inserted');
		});
		var sqlDelete =
			'DELETE FROM iot_database.sensors WHERE humidity >=100 or temperature >=100';
		if (newHumidity > 100 || newHumidity > 100) {
			con.query(sqlDelete, function () {
				console.log('xoa du lieu loi thanh cong');
			});
		}
	}
});
