//setup chart
const labels = [];
const dataHum = {
	labels: labels,
	datasets: [
		{
			label: 'Humidity',
			backgroundColor: 'rgb(0, 0, 255)',
			borderColor: 'rgb(0, 0, 255)',
			data: [],
		},
	],
};
const dataTemp = {
	labels: labels,
	datasets: [
		{
			label: 'Temperature',
			backgroundColor: 'rgb(250, 125, 125)',
			borderColor: 'rgb(250, 125, 125)',
			data: [],
		},
	],
};
const dataLight = {
	labels: labels,
	datasets: [
		{
			label: 'Light',
			backgroundColor: 'rgb(255,255,0)',
			borderColor: 'rgb(255,255,0)',
			data: [],
		},
	],
};

const generateConfig = function (
	labels = [],
	dataSet,
	backgroundColor,
	borderColor,
	title,
	label
) {
	const data = {
		labels: labels,
		datasets: [
			{
				label: label,
				backgroundColor: backgroundColor,
				borderColor: borderColor,
				data: dataSet,
			},
		],
	};
	return {
		type: 'line',
		data: data,
		options: {
			responsive: true,
			plugins: {
				title: {
					display: false,
					text: title,
				},
			},
			scales: {
				x: {
					ticks: {
						maxTicksLimit: 10,
					},
					title: {
						display: true,
						text: 'Time',
					},
				},
				y: {
					title: {
						display: true,
						text: 'Value',
					},
				},
			},
		},
	};
};
