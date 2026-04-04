import { createRoot } from 'react-dom/client';
import App from './App';
import 'shared-css/base.css';
import 'shared-css/dashboard.css';

createRoot(document.getElementById('root')!).render(<App />);
