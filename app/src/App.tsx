import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EntranceScreen from './screens/EntranceScreen';
import LobbyScreen from './screens/LobbyScreen';
import OnlineLobbyScreen from './screens/OnlineLobbyScreen';
import GamePlayScreen from './screens/GamePlayScreen';
import OnlineGameScreen from './screens/OnlineGameScreen';
import ResultScreen from './screens/ResultScreen';
import HallOfFameScreen from './screens/HallOfFameScreen';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* エントランス */}
        <Route path="/" element={<EntranceScreen />} />

        {/* ローカルモード */}
        <Route path="/lobby/:roomId" element={<LobbyScreen />} />
        <Route path="/game/:roomId" element={<GamePlayScreen />} />

        {/* オンラインモード */}
        <Route path="/online-lobby/:roomId" element={<OnlineLobbyScreen />} />
        <Route path="/online-game/:roomId" element={<OnlineGameScreen />} />

        {/* 共通 */}
        <Route path="/result/:roomId" element={<ResultScreen />} />
        <Route path="/hall-of-fame" element={<HallOfFameScreen />} />
      </Routes>
    </Router>
  );
}

export default App;
