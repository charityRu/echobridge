# EchoForge - Audio Memory Platform

A premium dark-mode React application for creating and experiencing audio-based memory narratives. Built with **React** (JavaScript), **Tailwind CSS**, and **Lucide React** icons.

## Project Structure

```
echobridge/
├── App.js                          # Main app component with view switching
├── components/
│   ├── SoundStudio.js             # Creator dashboard (3-step wizard)
│   ├── PatientView.js             # Accessible playback interface
│   └── shared/
│       ├── Timer.js               # Elapsed time display formatter
│       ├── MemoryDropdown.js       # Custom dropdown for era/location selection
│       └── WaveformVisualizer.js   # Animated audio visualization bars
├── index.js                        # React entry point
├── index.css                       # Global Tailwind styles
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.js               # PostCSS config for Tailwind
└── package.json                    # Dependencies & scripts
```

## Features

### Sound Studio (Creator Dashboard)
- **Step 1**: Memory Frame Selection
  - Two dropdown menus for era and location selection
  - "Generate Tracklist" button with icon
  
- **Step 2**: Split Layout
  - Left: Lyric Sheet placeholder with play button
  - Right: Voice Recording interface
    - Digital timer display (MM:SS)
    - Large, tappable microphone recording button
    - Animated waveform visualizer that responds to recording state
    - Warning text and instructions

- **Step 3**: Audio Anatomy
  - Three stacked waveform visualizers for different stems
  - Advanced Mix Controls toggle button
  - High-contrast, color-coded stems (Blue/Pink/Orange)

- **Footer**: Persistent save action bar with auto-save confirmation

### Patient View (Playback Screen)
- Session metadata display (title, year, genre)
- Large, accessible typography with highlighted keywords
- Gradient backgrounds for high contrast and readability
- Circular play/pause button (neon pink/orange gradient)
- Timeline progress bar with drag slider
- Memory Timeline indicator

## Setup & Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm start
```

The app should open at `http://localhost:3000` with hot reload enabled.

### Build for Production
```bash
npm run build
```

## Component API

### SoundStudio
```jsx
<SoundStudio onSwitchView={() => setCurrentView('patient')} />
```
- **Props**:
  - `onSwitchView`: Callback function to switch to Patient View

### PatientView
```jsx
<PatientView onSwitchView={() => setCurrentView('studio')} />
```
- **Props**:
  - `onSwitchView`: Callback function to switch back to Sound Studio

### MemoryDropdown
```jsx
<MemoryDropdown 
  label="When were they happiest?"
  value={selectedValue}
  onChange={(newValue) => setSelectedValue(newValue)}
  options={['1940s - Jazz Age', '1950s - Rock & Roll', ...]}
/>
```
- **Props**:
  - `label`: Display label above dropdown
  - `value`: Currently selected value
  - `onChange`: Callback when selection changes
  - `options`: Array of selectable options

### WaveformVisualizer
```jsx
<WaveformVisualizer 
  isActive={isRecording} 
  intensity={0.8} 
  barCount={32}
  barColor="from-pink-500 to-orange-500"
/>
```
- **Props**:
  - `isActive`: Boolean to control animation intensity
  - `intensity`: Height multiplier for bars (0-1)
  - `barCount`: Number of bars to render (default: 24)
  - `barColor`: Tailwind gradient classes

### Timer
```jsx
<Timer seconds={recordTime} />
```
- **Props**:
  - `seconds`: Total seconds to display (formatted as MM:SS)

## Design System

### Color Palette
- **Primary**: Deep purple & charcoal (#581c87, #1a1a2e)
- **Accent**: Neon pink (#ec4899), Orange (#f97316), Blue (#3b82f6)
- **Backgrounds**: Gradient overlays with transparency

### Typography
- **Font**: System fonts (macOS/Windows defaults) for readability
- **Weights**: Bold/Black for headings, Medium/Regular for body
- **Sizes**: Responsive scaling (mobile-first approach)

### Spacing & Layout
- Grid-based approach using Tailwind's default 4px spacing
- Flexbox for component alignment (more flexible than pure CSS Grid for mixed layouts)
- Responsive breakpoints: `md:` (768px) for tablet+ layouts

## Development Notes

### Temporary Implementation Details
- **Recording State**: Currently mocked with basic timer. Will connect to Web Audio API later.
- **Audio Data**: Waveform visualizers use simulated data. Hook up to actual audio input when backend ready.
- **State Management**: Using React's `useState` hooks. Consider Redux/Zustand if complexity grows.
- **Backend**: Currently no backend integration. API endpoints will be added when services are ready.

### Next Steps
1. Integrate actual audio recording (Web Audio API / navigator.mediaDevices)
2. Connect to backend API for tracklist generation
3. Add persistent state management (localStorage/DB)
4. Implement real audio playback with time synchronization
5. Add accessibility features (ARIA labels, keyboard navigation)

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS Safari 14+, Chrome Mobile

## License
Internal use only.

---

**Built with ❤️ for memory preservation**
