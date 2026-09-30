import { Link } from 'react-router-dom';

type LinkButtonProps = {
  name: string;
  description: string;
  href: string;
};

const LinkButton = ({ name, description, href }: LinkButtonProps) => (
  <Link to={href} className="group flex w-full items-center justify-between gap-6 rounded-2xl border border-current/20 bg-transparent p-5 text-left transition-colors hover:border-current/50 hover:bg-current/4 sm:p-6">
    <span>
      <span className="block text-lg font-bold tracking-[-0.02em]">{name}</span>
      <span className="mt-1 block text-sm opacity-50">{description}</span>
    </span>
  </Link>
);

const Home = () => (
  <main className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:grid-cols-2 sm:px-8 lg:px-10">
    <LinkButton
      name="Show collection"
      description="Browse and search the records in your collection."
      href="/collection"
    />
    <LinkButton
      name="Random album"
      description="Choose a random album from your collection."
      href="/random"
    />
  </main>
);

export default Home;
