import { useEffect, useState } from "react";
import MapView from "./components/MapView";
import SearchBar from "./components/SearchBar";
import ForecastWeek from "./components/ForecastWeek";
import { loadSettlements } from "./utils/loadSettlements";

export default function App() {
  const [settlements, setSettlements] = useState([]);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  useEffect(() => {
    loadSettlements()
      .then(setSettlements)
      .catch(console.error);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "1000px" }}>
        <h1
          style={{
            textAlign: "center",
            fontSize: "72px",
            margin: "30px 0 20px",
          }}
        >
          Погода
        </h1>

        <div style={{ width: "900px", margin: "0 auto" }}>
          <SearchBar
            settlements={settlements}
            onSelect={setSelectedSettlement}
          />

          <MapView
            settlements={settlements}
            selectedSettlement={selectedSettlement}
            onSelect={setSelectedSettlement}
          />
        </div>

        <ForecastWeek settlement={selectedSettlement} />
      </div>
    </div>
  );
}