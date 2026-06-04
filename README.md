# Lumitra Studio

A modern browser-based drawing and image editing application built with React, TypeScript, PixiJS, and Zustand.

Lumitra Studio provides a fast and lightweight creative workspace directly in the browser. Users can draw, edit images, work with layers, create gradients, add text, and save projects using the native `.lumitra` format.

![Lumitra Studio](./docs/screenshot.png)

## ✨ Features

### 🎨 Drawing Tools

* Brush
* Mirror Brush
* Eraser
* Smudge Tool
* Fill Tool
* Eyedropper
* Hand Tool
* Move Tool
* Transform Tool
* Text Tool
* Line Tool
* Rectangle Tool
* Ellipse Tool

### 🖌 Brush Engine

* Custom brush presets
* Adjustable size
* Opacity control
* Stroke stabilizer
* Real-time rendering

### 🗂 Layer System

* Multiple layers
* Layer visibility
* Layer opacity
* Layer duplication
* Layer reordering
* Layer locking

### 🔤 Text Editing

* Text insertion
* Font selection
* Alignment controls
* Styling options
* Editable text objects

### 🌈 Gradient Engine

Supported gradient types:

* Linear
* Radial
* Angle
* Diamond
* Reflected

### 💾 Project Management

* Save projects
* Load projects
* Export PNG
* Native `.lumitra` project format
* Automatic project recovery

### 🎯 User Experience

* Modern dark interface
* Responsive layout
* Toast notifications
* Status bar
* Splash screen
* Theme controls
* Keyboard-friendly workflow

---

## 🚀 Live Demo

https://lumitra-tau.vercel.app

---

## 🛠 Technology Stack

### Frontend

* React 18
* TypeScript
* Vite

### Graphics

* PixiJS

### State Management

* Zustand

### UI

* Radix UI
* shadcn/ui
* Lucide React

### Utilities

* JSZip
* File Saver
* React Hook Form
* Zod
* TanStack Query

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/AndreiPabiarzhyn/lumitra.git
cd lumitra
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production version:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Run tests:

```bash
npm run test
```

---

## 📁 Project Structure

```text
src/
├── app/          Zustand stores and application state
├── components/   React UI components
├── engine/       Drawing, rendering and tool logic
├── styles/       Global styles
└── main.tsx      Application entry point

public/
└── assets
```

---

## 📄 Lumitra Project Format

Lumitra projects are stored using the `.lumitra` format.

The format contains:

* Project metadata
* Layer information
* Canvas settings
* Drawing data
* Text objects
* Editor state

Projects can be saved locally and reopened later without losing editing capabilities.

---

## 🗺 Roadmap

### Completed

* [x] Drawing engine
* [x] Layer system
* [x] Text tool
* [x] Gradient support
* [x] Project save/load
* [x] PNG export
* [x] Automatic recovery

### Planned

* [ ] Animation timeline
* [ ] GIF export workflow
* [ ] Selection tools
* [ ] Filters and effects
* [ ] Cloud project storage
* [ ] Collaboration mode
* [ ] Asset library
* [ ] Plugin system

---

## 🎯 Vision

Lumitra Studio aims to provide creators with a lightweight alternative to traditional desktop graphics editors.

The project focuses on speed, accessibility, and a clean user experience while keeping the entire workflow inside the browser.

---

## 👨‍💻 Author

Andrei Pabiarzhyn

---

## 📜 License

MIT License
