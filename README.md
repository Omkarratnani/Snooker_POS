# Qvera POS System

A modern, fast, and fully offline Point of Sale (POS) system specifically designed for Snooker, Pool, and Billiards clubs. This application provides real-time table time tracking, cafe inventory management, advanced billing (including split bills and discounts), and comprehensive sales reporting. It is packaged as a standalone desktop application.

## 🚀 Features

- **Real-Time Table Management:** Start, pause, resume, and stop matches across multiple tables. The timer runs flawlessly even when the application is minimized or inactive.
- **Cafe & Inventory System:** Add food and beverage items directly to a table's running tab.
- **Advanced Checkout:** Supports custom discounts (percentage or flat amount), bill splitting with manual name entry, and multiple payment methods (Cash, UPI, Card).
- **Automated Invoicing:** Generates professional invoice PDFs and printable receipts upon checkout.
- **Reporting & Analytics:** View detailed daily sales summaries, table revenue vs. cafe revenue, and export detailed CSV reports.
- **Fully Offline & Secure:** All data is stored locally in a robust SQLite database. No internet connection is required to run the business.

## 🛠️ Tech Stack

This project follows a modern Client-Server-Desktop architectural pattern:

### Frontend
- **React.js (v18)** - Core UI framework.
- **Vite** - Extremely fast frontend build tool.
- **Tailwind CSS** - Utility-first styling for a sleek, responsive, and modern design.
- **Lucide React** - Clean and consistent iconography.
- **Shadcn UI (Custom)** - Accessible, high-quality UI components (Cards, Tabs, Badges, Inputs, Buttons).

### Backend
- **Node.js & Express.js** - Lightweight local REST API server.
- **SQLite3** - Relational database for persistent, crash-proof local data storage.

### Desktop Packaging
- **Electron** - Wraps the web application and local Node server into a single, native Windows executable (`.exe`).
- **Electron-Builder** - Handles packaging, signing, and building the installer.

## ⚙️ How It Works Under the Hood

1. **The Desktop Wrapper:** When the `.exe` is launched, Electron spins up a hidden background Node.js process (the Express server).
2. **Database Initialization:** The backend connects to `database.sqlite` (stored safely in the user's `AppData` directory in production) and exposes REST API endpoints.
3. **The User Interface:** Electron then creates a Chromium browser window displaying the Vite-compiled React frontend.
4. **Data Sync:** The React frontend communicates strictly via the local API (`http://localhost:5001`), ensuring that state is always persisted to SQLite instantly. If the app is suddenly closed or crashes, no data is lost. 

## 📦 Running Locally (Development)

To run the application in a development environment:

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (spins up Vite, the Express backend, and the Electron wrapper simultaneously):
   ```bash
   npm run electron:dev
   ```

## 🏗️ Building for Production

To compile the application into a standalone Windows installer:
```bash
npm run electron:build
```
This will compile the frontend assets into the `dist/` folder and package the entire stack into an installable `.exe` located in the `release/` directory.
