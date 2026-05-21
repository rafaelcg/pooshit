export {
  closeDb,
  getDb,
  getDriver,
  getTables,
  isPostgres,
  runMigrations,
  useDb,
} from "./client.js";

export type { Deploy, NewDeploy } from "./schema.js";
