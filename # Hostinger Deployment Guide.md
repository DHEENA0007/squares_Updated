# Hostinger Deployment Guide

This guide provides step-by-step instructions for deploying your Vite/React frontend and Node.js/Express backend to Hostinger.

### Project Structure Overview

*   **Frontend (React)**: Located in the root directory. This will be built into a set of static files.
*   **Backend (Node.js/Express)**: Located in the `/server` directory. This will run as a Node.js application on the server.

### Deployment Steps

#### Step 1: Build the React Frontend

First, you need to create a production build of your React application. This will generate optimized static files (HTML, CSS, JavaScript) in a `dist` folder.

Run the following command in your project's root directory:

```bash
npm run build
```

This command executes `vite build`, creating the `dist` directory.

#### Step 2: Prepare the Backend to Serve the Frontend

Your Express server needs to be configured to serve the static files generated in the previous step. Ensure your `server/index.js` includes the following code to serve the `dist` folder:

```javascript
// server/index.js

// ... other imports
const path = require('path');

// ... after your API routes

// Serve frontend for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// ... rest of your server code
```

#### Step 3: Upload Your Project to Hostinger

Upload your entire project directory (including the `server` folder and the newly created `dist` folder) to your Hostinger file manager. A common location is the `public_html` directory, or a subdirectory within it.

#### Step 4: Set Up Node.js on Hostinger

1.  In your Hostinger hPanel, navigate to **Advanced -> Node.js**.
2.  Click **Create Application**.
3.  Set your **Node.js version** (e.g., 18.x or 20.x).
4.  Set the **Application root** to your project's main folder (e.g., `public_html/my-app`).
5.  Set the **Application startup file** to `server/index.js`.
6.  Click **Create**.

#### Step 5: Install Dependencies

1.  Once the application is created, you'll see an option to **Enter the Application**. This will open a terminal.
2.  First, install the backend dependencies:
    ```bash
    cd server && npm install
    ```
3.  Then, install the frontend dependencies from the root:
    ```bash
    cd .. && npm install
    ```

#### Step 6: Set Environment Variables

In the Node.js setup section of hPanel, add your environment variables (like `DATABASE_URL`, `JWT_SECRET`, etc.) from your `.env` file. This is more secure than uploading the `.env` file directly.

#### Step 7: Start the Application

Go back to the Node.js application screen in hPanel and click **Start** or **Restart**.

Your application should now be live. You can view logs from the same Node.js section in hPanel to troubleshoot any issues.
