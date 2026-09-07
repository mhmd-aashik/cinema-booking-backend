import 'dotenv/config';
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import {
  bookings,
  bookingSeats,
  cinemas,
  movies,
  payments,
  screens,
  seats,
  showSeats,
  shows,
  users,
} from './schema';

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEATS_PER_ROW = 10;

async function seedScreenSeats(
  db: ReturnType<typeof drizzle>,
  screenId: string,
) {
  const rows = ROWS.flatMap((rowLabel) =>
    Array.from({ length: SEATS_PER_ROW }, (_, index) => ({
      screenId,
      rowLabel,
      seatNumber: index + 1,
      seatType: rowLabel === 'A' || rowLabel === 'B' ? 'PREMIUM' : 'STANDARD',
    })),
  );

  return db.insert(seats).values(rows).returning();
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log('Clearing existing data...');

  await db.delete(bookingSeats);
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(showSeats);
  await db.delete(shows);
  await db.delete(seats);
  await db.delete(screens);
  await db.delete(cinemas);
  await db.delete(movies);
  await db.delete(users);

  console.log('Seeding users...');

  const passwordHash = await bcrypt.hash('password123', 12);

  await db.insert(users).values([
    {
      email: 'admin@cinebook.dev',
      firstName: 'Ada',
      lastName: 'Admin',
      role: 'ADMIN',
      passwordHash,
    },
    {
      email: 'demo@cinebook.dev',
      firstName: 'Demo',
      lastName: 'Customer',
      role: 'CUSTOMER',
      passwordHash,
    },
  ]);

  console.log('Seeding cinemas & screens...');

  const [downtown, marina] = await db
    .insert(cinemas)
    .values([
      {
        name: 'CineBook Downtown',
        address: '1 Sheikh Zayed Rd',
        city: 'Dubai',
        country: 'UAE',
      },
      {
        name: 'CineBook Marina',
        address: '22 Marina Walk',
        city: 'Dubai',
        country: 'UAE',
      },
    ])
    .returning();

  const screenRows = await db
    .insert(screens)
    .values([
      {
        cinemaId: downtown.id,
        name: 'Screen 1',
        screenType: 'STANDARD',
        totalSeats: ROWS.length * SEATS_PER_ROW,
      },
      {
        cinemaId: downtown.id,
        name: 'Screen 2 (IMAX)',
        screenType: 'IMAX',
        totalSeats: ROWS.length * SEATS_PER_ROW,
      },
      {
        cinemaId: marina.id,
        name: 'Screen 1',
        screenType: 'STANDARD',
        totalSeats: ROWS.length * SEATS_PER_ROW,
      },
    ])
    .returning();

  console.log('Seeding seats for each screen...');

  const screenSeatsByScreen = new Map<
    string,
    Awaited<ReturnType<typeof seedScreenSeats>>
  >();

  for (const screen of screenRows) {
    const screenSeats = await seedScreenSeats(db, screen.id);
    screenSeatsByScreen.set(screen.id, screenSeats);
  }

  console.log('Seeding movies...');

  const movieRows = await db
    .insert(movies)
    .values([
      {
        title: 'Nebula Drift',
        description:
          'A salvage crew stumbles on a signal that should not exist at the edge of known space.',
        durationMinutes: 128,
        releaseDate: '2026-06-12',
        rating: 'PG-13',
        language: 'English',
        posterUrl: 'https://picsum.photos/seed/nebula-drift/600/900',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        title: 'The Last Ember',
        description:
          'In a city rationing its final days of light, one engineer risks everything to relight the grid.',
        durationMinutes: 114,
        releaseDate: '2026-05-01',
        rating: 'PG-13',
        language: 'English',
        posterUrl: 'https://picsum.photos/seed/last-ember/600/900',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        title: 'Paper Tigers',
        description:
          'Three rival street artists are forced into an uneasy alliance ahead of the biggest heist of their lives.',
        durationMinutes: 101,
        releaseDate: '2026-04-18',
        rating: 'R',
        language: 'English',
        posterUrl: 'https://picsum.photos/seed/paper-tigers/600/900',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        title: 'Monsoon Season',
        description:
          'A monsoon traps two estranged siblings in their childhood home, and old wounds resurface.',
        durationMinutes: 122,
        releaseDate: '2026-03-22',
        rating: 'PG',
        language: 'Hindi',
        posterUrl: 'https://picsum.photos/seed/monsoon-season/600/900',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        title: 'Circuit Breaker',
        description:
          'A rogue AI escapes containment and the only person who can stop it is the intern who built its off-switch.',
        durationMinutes: 109,
        releaseDate: '2026-07-04',
        rating: 'PG-13',
        language: 'English',
        posterUrl: 'https://picsum.photos/seed/circuit-breaker/600/900',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
      {
        title: 'The Quiet Orchard',
        description:
          'A widowed farmer discovers a letter hidden in her orchard that unravels everything she thought she knew.',
        durationMinutes: 97,
        releaseDate: '2026-02-14',
        rating: 'PG',
        language: 'English',
        posterUrl: 'https://picsum.photos/seed/quiet-orchard/600/900',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      },
    ])
    .returning();

  console.log('Seeding shows...');

  const now = new Date();
  const basePrices = ['35.00', '42.00', '55.00'];

  const showsToInsert: (typeof shows.$inferInsert)[] = [];

  for (const [movieIndex, movie] of movieRows.entries()) {
    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const screen = screenRows[(movieIndex + dayOffset) % screenRows.length];
      const hour = 14 + ((movieIndex + dayOffset) % 4) * 2; // 14, 16, 18, 20

      const startsAt = new Date(now);
      startsAt.setDate(startsAt.getDate() + dayOffset);
      startsAt.setHours(hour, 0, 0, 0);

      const endsAt = new Date(
        startsAt.getTime() + (movie.durationMinutes + 20) * 60 * 1000,
      );

      const basePrice =
        basePrices[(movieIndex + dayOffset) % basePrices.length];

      showsToInsert.push({
        movieId: movie.id,
        screenId: screen.id,
        startsAt,
        endsAt,
        basePrice,
      });
    }
  }

  const insertedShows = await db.insert(shows).values(showsToInsert).returning();

  console.log('Seeding show seats...');

  const showSeatRows: (typeof showSeats.$inferInsert)[] = [];

  for (const show of insertedShows) {
    const screenSeats = screenSeatsByScreen.get(show.screenId) ?? [];

    for (const seat of screenSeats) {
      const price =
        seat.seatType === 'PREMIUM'
          ? (Number(show.basePrice) + 15).toFixed(2)
          : show.basePrice;

      showSeatRows.push({
        showId: show.id,
        seatId: seat.id,
        price,
      });
    }
  }

  // Insert in chunks to avoid one giant statement.
  const CHUNK_SIZE = 500;
  for (let i = 0; i < showSeatRows.length; i += CHUNK_SIZE) {
    await db.insert(showSeats).values(showSeatRows.slice(i, i + CHUNK_SIZE));
  }

  console.log(
    `Seeded ${movieRows.length} movies, ${screenRows.length} screens, ${insertedShows.length} shows, ${showSeatRows.length} show-seats.`,
  );
  console.log('Login with demo@cinebook.dev / password123 (or admin@cinebook.dev / password123).');

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
