import { FishOff } from 'lucide-react';

export default function ExpiredPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6">
      <FishOff className="mx-auto h-1/3 w-1/3 text-primary-300" />
      <h2 className="pb-3 text-center text-4xl text-primary-400">
        Stinky
      </h2>
      <p className="text-center text-lg">
        This fish has expired. It looks like we have to throw it away.
      </p>
      <p className="text-lg">Please try again.</p>
    </div>
  );
}
