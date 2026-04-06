// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_lame_scarlet_witch.sql';
import m0001 from './0001_white_speedball.sql';
import m0002 from './0002_chubby_gorilla_man.sql';
import m0003 from './0003_busy_stranger.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003
    }
  }
  