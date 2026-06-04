# Lumitra

Lumitra is a browser-based drawing and image editing app built with React, TypeScript, Vite, PixiJS, and Zustand.

The project focuses on a lightweight creative workspace: canvas drawing, layers, text, gradients, transforms, and project export/import directly in the browser.

## Features

- Drawing canvas powered by PixiJS
- Brush, mirror brush, eraser, smudge, fill, eyedropper, hand, move, transform, text, line, rectangle, and ellipse tools
- Brush presets with size, opacity, and stabilizer controls
- Layer management and rendering
- Text editing with font, alignment, and styling controls
- Linear, radial, angle, diamond, and reflected gradients
- Project save/load support with the `.lumitra` format
- Toast notifications, status bar, splash screen, and theme/help controls

## Tech Stack

- React 19
- TypeScript
- Vite
- PixiJS
- Zustand
- Lucide React icons

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  app/          Zustand stores for tools, brush settings, colors, layers, text, projects, and UI state
  components/   React UI panels, toolbars, controls, notifications, and shell elements
  engine/       Canvas, brush, layer, gradient, text, project, viewport, history, and tool logic
  styles/       Global application styles
public/         App icon and static assets
```

## Project Files

Lumitra saves projects with the `.lumitra` extension. The current project package format stores project data in a small ZIP-like package containing Lumitra metadata and project JSON.

## Development Notes

- The app entry point is `src/main.tsx`.
- The main shell composition lives in `src/App.tsx`.
- Canvas behavior is centered around `src/engine/DrawingCanvas.tsx`.
- Tool implementations live in `src/engine/tools/`.
- Project serialization lives in `src/engine/project/`.
