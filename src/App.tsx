import { DrawingCanvas } from './engine/DrawingCanvas';
import { LeftToolbar } from './components/LeftToolbar';
import { RightSidebar } from './components/RightSidebar';
import { AppFooter } from './components/AppFooter';
import { CanvasControls } from './components/CanvasControls';
import { StatusBar } from './components/StatusBar';
import { TopToolbar } from './components/TopToolbar';
import { HelpThemeControls } from './components/HelpThemeControls';
import { SplashScreen } from './components/SplashScreen';
import { ToastNotifications } from './components/ToastNotifications';
import { TransformActionBar } from './components/TransformActionBar';

export default function App() {
  return (
    <main className="app-shell">
      <DrawingCanvas />
      <TopToolbar />
      <TransformActionBar />
      <LeftToolbar />
      <RightSidebar />
      <CanvasControls />
      <HelpThemeControls />
      <StatusBar />
      <AppFooter />
      <ToastNotifications />
      <SplashScreen />
    </main>
  );
}
