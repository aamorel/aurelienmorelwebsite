import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/lora/latin-400.css'
import '@fontsource/lora/latin-400-italic.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import './styles.css'

// Drei Html owns nested DOM roots. StrictMode's synthetic unmount currently
// produces a synchronous-unmount warning in that dependency.
createRoot(document.getElementById('root')!).render(<App />)
