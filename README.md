# Time Management App

A full-stack time management application built with **FastAPI** (Backend) and **React** (Frontend).

## Features
- **Backend**: High-performance API built with FastAPI.
- **Frontend**: Modern UI built with React, Vite, and Tailwind CSS. 
- **Containerization**: Fully Dockerized for easy deployment.

## Getting Started

### Prerequisites
- Docker & Docker Compose

### Installation & Running
1.  Clone the repository.
2.  Start the application using Docker Compose:
    ```bash
    docker compose up --build
    ```
3.  Access the application:
    -   **Frontend**: `http://localhost:5173`
    -   **Backend API**: `http://localhost:8000`
    -   **API Documentation**: `http://localhost:8000/docs`

### Manual Setup (Without Docker)

#### Backend
1.  Navigate to `backend/`.
2.  Install dependencies: `pip install -r requirements.txt`
3.  Run server: `uvicorn app.main:app --reload`

#### Frontend
1.  Navigate to `frontend/`.
2.  Install dependencies: `npm install`
3.  Run dev server: `npm run dev`
