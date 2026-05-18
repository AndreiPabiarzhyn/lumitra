import { DrawingCanvas } from './engine/DrawingCanvas';
import { LeftToolbar } from './components/LeftToolbar';
import { RightSidebar } from './components/RightSidebar';
import { AppFooter } from './components/AppFooter';
import { CanvasControls } from './components/CanvasControls';
import { StatusBar } from './components/StatusBar';
import { TopToolbar } from './components/TopToolbar';

export default function App() {
  return (
    <main className="app-shell">
      <DrawingCanvas />
      <TopToolbar />
      <LeftToolbar />
      <RightSidebar />
      <CanvasControls />
      <StatusBar />
      <AppFooter />
    </main>
  );
}
