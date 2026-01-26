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
- Create venv:           python -m venv venv
- Activate:              venv\Scripts\activate (Windows)
                       source venv/bin/activate (Mac/Linux)
- Install packages:      pip install -r requirements.txt
- List packages:         pip list
- Update package:        pip install --upgrade package-name
- Uninstall package:     pip uninstall package-name
- Freeze dependencies:   pip freeze > requirements.txt
- Deactivate:            deactivate
- Run server:            python main.py
- Stop server:           Ctrl+C


## Team Members
- Furqan Khurrum
- Kencho Lodhen
- Franz Balite
- Kai williams
- Marcos Ian Araujo

## License
TBD
