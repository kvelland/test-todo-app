import PocketBase from "pocketbase";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  created: string;
  updated: string;
};

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(url);
