# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/02c92ed1-b556-415c-9d37-ada5644522a8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/02c92ed1-b556-415c-9d37-ada5644522a8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

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

Simply open [Lovable](https://lovable.dev/projects/02c92ed1-b556-415c-9d37-ada5644522a8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Deployment & Environment

This application supports both local development and production deployment:

### 🚀 Live URLs
- **Frontend (Vercel)**: https://squares-smoky.vercel.app/
- **Backend (Render)**: https://squares-9d84.onrender.com

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
VITE_API_URL=https://squares-9d84.onrender.com/api
VITE_API_BASE_URL=https://squares-9d84.onrender.com
```

**For Backend (Render):**
Use the variables from `server/.env.production` with your actual values.

### 📋 Quick Start
1. **Local Development**: Just run `npm run dev` - no env setup required
2. **Production**: Set the Vite environment variables above in Vercel
3. **Testing**: Use the live URLs above to test the deployed version

> **Note**: All services use fallbacks to localhost, so local development works without any configuration.
# Squares-V2
