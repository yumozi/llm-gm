# Mugen AI - The AI World Engine

A comprehensive world-building and session management platform built with Next.js, Supabase, and modern web technologies.

## Features

- **World Building**: Create and manage AI-powered worlds with canon entities (NPCs, items, abilities, locations, organizations, taxonomies, rules, story nodes)
- **Session Management**: Run interactive sessions within your worlds with dynamic player tracking
- **Authentication**: Secure authentication with Supabase (Email/Password and Google OAuth)
- **Real-time Chat**: Live session chat with real-time updates
- **Dynamic Player Fields**: Customizable player attributes per world
- **Beautiful UI**: Modern, animated interface with Framer Motion and shadcn/ui

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL with pgvector, ltree)
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mugen-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Run database migrations:

Go to your Supabase project dashboard → SQL Editor and run each migration file in the `migrations/` folder in numerical order (001 through 021).

**Important**: Make sure to run `021_storage_setup.sql` to set up the storage bucket and permissions for image uploads.

Alternatively, if you have Supabase CLI installed:
```bash
for file in migrations/*.sql; do
  supabase db execute -f "$file"
done
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mugen-ai/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── browse/            # Browse worlds page
│   ├── manage/            # Manage worlds pages
│   ├── sessions/          # Session management pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── layout/           # Layout components (Navbar, etc.)
│   └── ui/               # shadcn/ui components
├── contexts/             # React contexts (Auth)
├── lib/                  # Utility libraries
│   ├── supabase/        # Supabase client setup
│   ├── database.types.ts # Database types
│   └── utils.ts         # Utility functions
├── migrations/          # Database migration files
└── public/             # Static assets
```

## Database Schema

### Canon Tables (World-scoped)
- `worlds` - World definitions
- `abilities` - Character abilities
- `items` - Items and equipment
- `organizations` - Factions and groups
- `taxonomies` - Classification systems
- `locations` - Hierarchical locations (using ltree)
- `npcs` - Non-player characters
- `rules` - World rules and mechanics
- `story_nodes` - Story progression nodes
- `story_edges` - Story connections
- `world_player_fields` - Custom player field definitions

### Runtime Tables (Session-scoped)
- `sessions` - Game sessions
- `players` - Player characters
- `generated_items` - Session-specific items
- `generated_characters` - Session-specific NPCs
- `generated_locations` - Session-specific locations
- `generated_abilities` - Session-specific abilities
- `session_messages` - Chat messages
- `session_canon_state` - Session-specific state overrides

## Key Features

### Authentication
- Email/Password authentication
- Google OAuth
- Protected routes with middleware
- Persistent sessions

### World Management
- Create and edit worlds
- Define NPCs, items, abilities, locations, and more
- Tabbed editor interface
- Auto-save functionality
- Image upload support

### Session Management
- Browse and start sessions from existing worlds
- Dynamic player creation with custom fields
- Real-time chat interface
- Player state tracking
- Session history

### Design System
- Custom dark theme with cyan/violet/amber accents
- Consistent spacing and typography
- Smooth animations and transitions
- Responsive design
- Accessibility-friendly

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Animations with [Framer Motion](https://www.framer.com/motion/)
