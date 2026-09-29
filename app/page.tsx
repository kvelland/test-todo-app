import TodoApp from "@/components/TodoApp";

export default function Home() {
  return (
    <main className="shell">
      <section className="sheet">
        <header className="sheet__header">
          <p className="eyebrow">A little list for today</p>
          <h1 className="title">
            Todos<span className="title__dot">.</span>
          </h1>
        </header>
        <TodoApp />
      </section>
      <p className="colophon">Kept safe in PocketBase</p>
    </main>
  );
}
