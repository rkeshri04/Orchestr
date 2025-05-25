import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from "@vercel/analytics"

injectSpeedInsights();
inject();



createRoot(document.getElementById("root")!).render(<App />);
