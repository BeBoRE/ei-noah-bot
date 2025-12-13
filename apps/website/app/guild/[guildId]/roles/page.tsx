import { Suspense } from 'react';

import { RoleSkeleton } from './RoleButton';
import RoleScreen from './RoleScreen';

function RolePage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md bg-primary-100 p-4 dark:bg-background">
        <div className="flex place-content-between">
          <h1 className="flex-1 text-3xl">Role Selection</h1>
        </div>
        <div className="grid grid-cols-2 place-content-start items-start justify-items-start gap-4 py-2 md:grid-cols-4 xl:grid-cols-5">
          <Suspense
            fallback={[...Array(4).keys()].map((_, index) => (
              <RoleSkeleton key={index}/>
            ))}
          >
            <RoleScreen />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default RolePage;
