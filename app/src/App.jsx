import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import Header from './components/header/Header';
import Schedule from './pages/schedule/Schedule';
import Favorites from './pages/favorites/Favorites';
import BetweenStations from './pages/between-stations/BetweenStations';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule/:code" element={<Schedule />} />
        <Route path="/between-stations" element={<BetweenStations />}/>
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </BrowserRouter>
  );
}