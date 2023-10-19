import Link from 'next/link';
import { Button } from 'app/_components/ui/button';
import { ArrowLeft } from 'lucide-react';

import CreateForm from './CreateForm';

type Props = {
  params: {
    guildId: string;
  };
};

function CreatePage({ params: { guildId } }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md bg-primary-100 p-4 dark:bg-primary-900">
        <div className="flex items-center gap-2 pb-4">
          <Button asChild className=" aspect-square rounded-full p-2">
            <Link href=".">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="flex-1 text-3xl">Create a new role</h1>
        </div>
        <CreateForm />
      </div>
    </div>
  );
}

export default CreatePage;
