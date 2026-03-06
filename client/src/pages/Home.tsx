import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Redirect to game after a brief delay so crawlers can index the content
    const timer = setTimeout(() => {
      window.location.href = '/game.html';
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-600 to-blue-900 text-white p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "'Press Start 2P', cursive" }}>
          Super Mario Kart
        </h1>
        <p className="text-lg md:text-xl text-blue-200">
          Free 3D Browser Racing Game — Race, Drift &amp; Compete Online!
        </p>
      </header>
      <main className="max-w-3xl text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          Choose Your Course &amp; Start Racing
        </h2>
        <p className="text-blue-100 mb-6 leading-relaxed">
          Experience the thrill of kart racing right in your browser. Super Mario Kart features three exciting courses — Mario Circuit, Frappe Snowland, and Bowser Castle — each with unique terrain and challenges. Select from 50cc, 100cc, or 150cc difficulty classes and compete against AI opponents. Master drifting to charge Mini-Turbo boosts, collect items to gain an edge, and race to the top of the global leaderboard!
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold mb-4">
          Game Features
        </h2>
        <ul className="text-blue-100 text-left inline-block mb-6 space-y-2">
          <li>🏁 3 Racing Courses: Mario Circuit, Frappe Snowland, Bowser Castle</li>
          <li>🏎️ 3 Difficulty Classes: 50cc, 100cc, 150cc</li>
          <li>💨 Drift &amp; Mini-Turbo Boost System</li>
          <li>🎯 Items: Shells, Bananas, Mushrooms &amp; More</li>
          <li>🤖 AI Opponents with Competitive Racing</li>
          <li>🏆 Global Leaderboard &amp; Score Rankings</li>
          <li>🎵 Original Soundtrack &amp; Sound Effects</li>
          <li>🎮 Keyboard Controls: WASD / Arrow Keys</li>
        </ul>
        <p className="text-blue-200 text-sm animate-pulse">
          Loading game...
        </p>
      </main>
      <footer className="mt-8 text-blue-300 text-xs">
        <p>Super Mario Kart — A free online 3D kart racing game built with Three.js</p>
      </footer>
    </div>
  );
}
