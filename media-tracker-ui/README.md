# Anime Tracker MVP

A personal, local-first anime tracking application built with Angular and IndexedDB.

## Features

- **Local-First**: All data stored locally in IndexedDB, works completely offline
- **Smart Add**: Search anime via MyAnimeList (Jikan API) with autocomplete
- **Kanban Board**: Drag & drop anime cards between customizable status columns
- **Comprehensive Tracking**: Track episodes, scores, genres, notes, and more
- **No Backend Required**: Runs entirely in the browser

## Tech Stack

- **Angular 21** with standalone components
- **TypeScript** for type safety
- **Dexie.js** for IndexedDB management
- **Angular CDK** for drag & drop functionality
- **Jikan API** for MyAnimeList integration
- **SCSS** for styling

## Project Structure

```
src/app/
├── models/              # Data models
│   ├── anime.model.ts
│   ├── status.model.ts
│   └── mal-anime.model.ts
├── services/            # Business logic
│   ├── database.service.ts
│   ├── anime.service.ts
│   ├── status.service.ts
│   └── mal.service.ts
├── components/          # Reusable components
│   ├── kanban-board/
│   └── add-anime-dialog/
└── pages/              # Page components
    └── home/
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will be available at `http://localhost:4200`

### Build for Production

```bash
npm run build
```

## Database Schema

### Anime Table
- `id`: Auto-generated primary key
- `title`: Anime title
- `coverImage`: Cover image URL
- `malId`: MyAnimeList ID
- `episodesWatched`: Number of episodes watched
- `totalEpisodes`: Total number of episodes
- `statusId`: Foreign key to Status table
- `score`: Rating (0-10, 0 = not scored)
- `genres`: Array of genre names
- `releaseYear`: Year of release
- `notes`: User notes
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Status Table
- `id`: Auto-generated primary key
- `name`: Status name (e.g., "Watching", "Completed")
- `color`: Hex color code for visual identification
- `order`: Display order in kanban board
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Default Statuses

The app comes with 5 default statuses:
1. Plan to Watch (Gray)
2. Watching (Blue)
3. Completed (Green)
4. On Hold (Orange)
5. Dropped (Red)

## Usage

### Adding Anime

1. Click the "Add Anime" button
2. Search for anime using the MyAnimeList search
3. Select an anime from the results to auto-populate fields
4. Or click "Or add manually" to enter details manually
5. Adjust episodes watched, score, and notes as needed
6. Click "Save"

### Managing Anime

- **Drag & Drop**: Drag anime cards between status columns to update their status
- **View Details**: All anime information is displayed on the card

### Customizing Statuses

Statuses are stored in IndexedDB and can be customized by modifying the `DEFAULT_STATUSES` in `src/app/models/status.model.ts` before first run, or by adding status management features.

## Architecture Decisions

### Clean Architecture
- **Models**: Pure data structures
- **Services**: Business logic and data access
- **Components**: UI presentation and user interaction

### Local-First Design
- All data persists in IndexedDB
- No authentication or backend required
- Works completely offline
- External API (Jikan) used only for search, not required for core functionality

### Reactive Data Flow
- Uses Dexie's `liveQuery` for reactive database queries
- Automatic UI updates when data changes
- Converted to RxJS Observables for Angular integration

## API Integration

### Jikan API (MyAnimeList)
- Base URL: `https://api.jikan.moe/v4`
- Rate limit: 1 request per second (handled automatically)
- Used for anime search and metadata retrieval
- Completely optional - app works without internet connection

## Future Enhancements (Not in MVP)

- Anime detail view/edit dialog
- Statistics and analytics
- Import/export functionality
- Custom status management UI
- Anime recommendations
- Multiple lists/collections
- Backup/restore functionality

## Development

### Running Tests

```bash
npm test
```

### Code Style

The project uses Prettier for code formatting:
- Print width: 100
- Single quotes
- Angular parser for HTML

## License

This is a personal project for educational purposes.

## Credits

- Anime data provided by [MyAnimeList](https://myanimelist.net/) via [Jikan API](https://jikan.moe/)
