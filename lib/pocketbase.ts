import PocketBase from "pocketbase";

export type Todo = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  /** PocketBase date string ("YYYY-MM-DD HH:mm:ss.SSSZ", UTC), or "" when the todo has no deadline. */
  deadline: string;
  created: string;
  updated: string;
  /** Relation ids pointing at records in the `tags` collection. */
  tags: string[];
};

export type Tag = {
  id: string;
  name: string;
  created: string;
  updated: string;
};

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(url);

// Each call site handles its own stale responses; don't let the SDK cancel
// duplicate in-flight requests (e.g. React Strict Mode double-running effects).
pb.autoCancellation(false);
