# BuildHomeMart Squares

## Project info

**URL**: https://squares-v2.vercel.app/

**Description**: Complete property management solution for buying, selling, and renting properties across India.

## How can I edit this code?

There are several ways of editing your application.

**Development Workflow**

You can work on this project locally using your preferred IDE. Clone this repo and push changes to deploy updates to the live application.

**Local Development**

Install dependencies and start the development server:

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Deploy this project using Vercel, Netlify, or any other static hosting service that supports Vite builds.

## Can I connect a custom domain?

Yes! You can connect a custom domain through your hosting provider's dashboard.

## Deployment & Environment

This application supports both local development and production deployment:

### 🚀 Live URLs
- **Frontend (Vercel)**: https://squares-v2.vercel.app/
- **Backend (Render)**: https://squares-v2.onrender.com

### 💻 Local Development
The app automatically falls back to localhost when no environment variables are set:
- Frontend: http://localhost:8001
- Backend: http://localhost:8000/api

### ⚙️ Environment Configuration

**For Local Development:**
1. Copy `.env.example` to `.env.local`
2. Update values as needed (defaults work for local development)

**For Production (Vercel):**
Add these environment variables in your Vercel dashboard:
```bash
VITE_API_URL=https://squares-v2.onrender.com/api
VITE_API_BASE_URL=https://squares-v2.onrender.com
```

**For Backend (Render):**
Use the variables from `server/.env.production` with your actual values.

### 📋 Quick Start
1. **Local Development**: Just run `npm run dev` - no env setup required
2. **Production**: Set the Vite environment variables above in Vercel
3. **Testing**: Use the live URLs above to test the deployed version

> **Note**: All services use fallbacks to localhost, so local development works without any configuration.
# Squares-V2
