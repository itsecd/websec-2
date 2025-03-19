import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import Header from './components/header/Header';
import Schedule from './pages/schedule/Schedule';
import Favorites from './pages/favorites/Favorites';
import Map from './pages/map/Map';

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule/:code" element={<Schedule />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/map" element={<Map />} />
      </Routes>
    </BrowserRouter>
  );
}