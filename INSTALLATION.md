


# Project: LoL Elo Simulation System - Installation Guide

This document provides instructions on how to set up and run the LoL Elo Simulation System, which includes a Node.js backend API and a Vue.js frontend dashboard.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Node.js and npm:**
    *   Node.js version 16.x or higher is recommended.
    *   npm (Node Package Manager) comes bundled with Node.js.
    *   Verify installation:
        ```bash
        node -v
        npm -v
        ```
2.  **MongoDB:**
    *   The system uses MongoDB as its database. Ensure you have a MongoDB server instance running (locally or on a cloud service).
    *   Download and install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community).
    *   Make sure the MongoDB service is started. Default connection URI is `mongodb://localhost:27017`.
3.  **Git (Optional, but Recommended):**
    *   For cloning the repository if the project is hosted on Git.

## Project Structure (Assumed)



Adjust paths in the instructions below if your structure differs.

## I. Backend Setup (Node.js API)

1.  **Navigate to the Backend Directory:**
    ```bash
    cd path/to/your/project/backend
    ```

2.  **Install Dependencies:**
    Install all necessary Node.js packages defined in `package.json`.
    ```bash
    npm install
    ```
    This will install Express.js, MongoDB Node.js Driver, Socket.IO, Faker.js, CORS, etc.

3.  **Environment Variables (Optional but Recommended):**
    The backend might use environment variables for configuration (e.g., MongoDB URI, Port). If so, create a `.env` file in the `backend/` directory based on a provided `.env.example` file or the following:
    ```env
    # backend/.env
    PORT=3000
    MONGO_URI=mongodb://localhost:27017
    DB_NAME=lol_elo_system 
    # Add any other environment variables your backend needs
    ```

4.  **Seed Initial Data (Champions):**
    The system requires an initial set of champions in the database. A seed script is provided.
    *   Ensure your MongoDB server is running.
    *   Run the seed script (adjust path if necessary):
        ```bash
        node seed/seedChampions.js
        ```
    This script will populate the `champions` collection in your MongoDB database. It's designed to be run once or when you need to refresh the champion list.

5.  **Start the Backend Server:**
    ```bash
    npm start
    ```
    Or, if your `package.json` defines a different script (e.g., `npm run dev` for development with nodemon):
    ```bash
    npm run dev
    ```
    By default, the backend API should now be running on `http://localhost:3000` (or the port specified in your `.env` file). The WebSocket server will also be running on the same port.

## II. Frontend Setup (Vue.js Dashboard)

1.  **Navigate to the Frontend Directory:**
    ```bash
    cd path/to/your/project/frontend
    ```

2.  **Install Dependencies:**
    Install all necessary Node.js packages for the Vue.js application.
    ```bash
    npm install
    ```
    This will install Vue.js, Vue Router, Socket.IO Client, Chart.js, vue-chartjs, Bootstrap (if installed via npm), Font Awesome (if installed via npm), Vite, etc.

3.  **Environment Variables (Optional but Recommended):**
    The frontend might use environment variables for API and WebSocket URLs. Create a `.env.local` file (or `.env`) in the `frontend/` directory:
    ```env
    # frontend/.env.local
    VITE_API_BASE_URL=http://localhost:3000/api
    VITE_WS_URL=http://localhost:3000
    ```
    *Note: Vite requires environment variables to be prefixed with `VITE_`.*


4.  **Start the Frontend Development Server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, typically on `http://localhost:5173` (or another available port). Open your web browser and navigate to this address.

## III. Initial System Usage

1.  **Ensure Backend and Frontend Servers are Running.**
2.  **Open the Frontend Dashboard** in your browser (e.g., `http://localhost:5173`).
3.  **Initialize Player Data (First Time):**
    *   Navigate to the "Leaderboard & Sim" page (usually the home page).
    *   In the "System Controls" section, click the "**Reset System Data**" button.
    *   A confirmation modal will appear. Confirm the reset.
    *   This action will call the backend API `POST /api/players/initialize` with `forceReset: true`, clearing any existing player/match data and creating 1000 new players with Faker-generated names and 1200 Elo.
4.  **Simulate Matches:**
    *   Use the "Matches to Simulate" input to specify the number of matches.
    *   Click "**Run Simulation**". The request will be sent via WebSocket.
    *   You should see a progress bar and status updates in the "System Controls" section.
    *   Once completed, the Leaderboard and other relevant statistics should update.
5.  **Explore:**
    *   Navigate to player profiles by clicking on player names in the Leaderboard.
    *   View match details by clicking on Match IDs in a player's history.
    *   Check the "Statistics" page for server-wide data visualizations.

## Troubleshooting

*   **CORS Errors:** If the frontend cannot connect to the backend API, ensure the `cors` middleware is correctly configured on the backend server (`server.js`) to allow requests from the frontend's origin (e.g., `http://localhost:5173`). The provided backend code uses `app.use(cors())` which allows all origins for development. For WebSocket, `new SocketIOServer(httpServer, { cors: { origin: "*" } })` is used.
*   **WebSocket Connection Issues:** Verify that the `VITE_WS_URL` in the frontend's `.env.local` file points to the correct address and port of your backend server. Check browser and server console logs for connection errors.
*   **MongoDB Connection:** Ensure your MongoDB server is running and accessible at the URI specified in the backend's `.env` file or `config/constants.js`.
*   **"Target is readonly" Vue warnings:** This might occur if a reactive object provided read-only from a parent component is attempted to be modified by a child component internally (often by third-party libraries). Ensure `socket` instances provided to child components are not wrapped in `readonly()` if methods like `emit()` are called on them.
*   **Missing Icons/Styles:** If Bootstrap or Font Awesome styles/icons are missing, double-check the import paths in `src/main.js` (if installed via npm) or the CDN links in `public/index.html`.

---

This guide should help in setting up the project. If you encounter any issues not covered here, please refer to the console logs in both the backend terminal and the browser's developer tools for more specific error messages.
