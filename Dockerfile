# Stage 1: Build the React frontend
FROM node:20-slim as build-frontend

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
# VITE_API_URL can be set to empty to use relative paths since backend and frontend are served from the same origin
ENV VITE_API_URL=/api/v1
RUN npm run build

# Stage 2: Build the FastAPI backend
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy the built frontend static files to backend/static
COPY --from=build-frontend /app/frontend/dist ./static

EXPOSE 8000

# Render dynamically assigns the port via the $PORT environment variable, so use it if available. 
# But uvicorn can be started via a shell command to pick up the env var.
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
