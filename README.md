# TruLabel - Ethical Consumer Product Scanner

Mobile application that allows users to scan product barcodes and view ethical ratings based on sustainability, labor practices, and company ethics.

## Project Information
- **Team**: Group 8 - PRJ 666
- **Timeline**: January 5 - April 17, 2026 (12 weeks)
- **Platform**: Web (Later on mobile)

## Tech Stack

### Frontend
- React Native v0.73+
- react-native-vision-camera for barcode scanning
- React Navigation for screen management
- AsyncStorage for local caching

### Backend
- FastAPI v0.109+
- Python v3.11+
- SQLite database
- Uvicorn server

### External API
- Open Food Facts API (free, unlimited)

## Features
- Barcode scanning using device camera
- Product information lookup
- Ethical score calculation (0-100 scale)
- Local caching for offline access
- Scan history tracking

## Project Structure
```
TruLabel/
├── frontend/          # React Native mobile app
├── backend/           # FastAPI server
├── docs/              # Documentation
└── README.md
```

## Setup Instructions
1. Create a virtual environment
   - Windows: `python -m venv venv`
   - macOS / Linux: `python3 -m venv venv`
2. Activate the virtual environment
   - Windows (PowerShell/CMD): `venv\Scripts\activate`
   - macOS / Linux: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. List installed packages: `pip list`
5. Upgrade a package: `pip install --upgrade package-name`
6. Uninstall a package: `pip uninstall package-name`
7. Freeze dependencies: `pip freeze > requirements.txt`
8. Deactivate the virtual environment: `deactivate`
9. Run the server (development)
   - If using a simple script: `python main.py`
   - Or with Uvicorn (FastAPI): `uvicorn main:app --reload`
10. Stop the server: `Ctrl+C`

## Setup Instructions Fontend
1. Go to the frontend folder: `cd frontend`
2. Install dependencies: `npm install`
3. (Optional) Set the backend URL in `frontend/.env.local`:
   - `NEXT_PUBLIC_API_BASE=http://localhost:8000`
4. Start the backend server: `uvicorn main:app --reload --port 8000`
4. Start the dev server: `npm run dev`
5. Open the app: `http://localhost:3000`


## Team Members
- Furqan Khurrum
- Kencho Lodhen
- Franz Balite
- Kai williams
- Marcos Ian Araujo

## License
TBD
