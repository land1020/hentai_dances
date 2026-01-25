import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EntranceScreen from './screens/EntranceScreen';
import LobbyScreen from './screens/LobbyScreen';
import GamePlayScreen from './screens/GamePlayScreen';
import ResultScreen from './screens/ResultScreen';
import HallOfFameScreen from './screens/HallOfFameScreen';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EntranceScreen />} />
        <Route path="/lobby/:roomId" element={<LobbyScreen />} />
        <Route path="/game/:roomId" element={<GamePlayScreen />} />
        <Route path="/result/:roomId" element={<ResultScreen />} />
        <Route path="/hall-of-fame" element={<HallOfFameScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
