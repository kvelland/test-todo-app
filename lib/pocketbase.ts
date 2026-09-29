import PocketBase from "pocketbase";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  created: string;
  updated: string;
};

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;

if (!url) {
  throw new Error(
    "NEXT_PUBLIC_POCKETBASE_URL is not set. Copy .env.example to .env and set the PocketBase URL.",
  );
}

export const pb = new PocketBase(url);
