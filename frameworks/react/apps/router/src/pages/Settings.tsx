import { useState } from 'react';

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Application settings</p>
      </div>
      <div style={{ maxWidth: '500px' }}>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
            />{' '}
            Enable notifications
          </label>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />{' '}
            Dark mode
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="settings-lang">Language</label>
          <select
            id="settings-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>
        <button onClick={() => alert('Settings saved (mock)')}>Save Settings</button>
      </div>
    </div>
  );
}
