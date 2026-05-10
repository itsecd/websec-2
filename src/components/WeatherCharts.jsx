import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function WeatherCharts({ forecast }) {
  const labels = forecast.map((item) => item.dt_forecast?.slice(11, 16) || "");

  const data = {
    labels,
    datasets: [
      {
        label: "Температура, °C",
        data: forecast.map((item) => item.temp_2_cel ?? null),
        borderColor: "#e74c3c",
        backgroundColor: "#e74c3c",
      },
      {
        label: "Осадки",
        data: forecast.map((item) => item.prate ?? null),
        borderColor: "#3498db",
        backgroundColor: "#3498db",
      },
      {
        label: "Ветер, м/с",
        data: forecast.map((item) => item.wind_speed_10 ?? null),
        borderColor: "#27ae60",
        backgroundColor: "#27ae60",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.3,
      },
    },
    plugins: {
      legend: {
        position: "top",
      },
    },
  };

  return (
    <div style={{ height: "200px" }}>
      <Line data={data} options={options} />
    </div>
  );
}