import Image from "next/image";
import Link from "next/link";
import ei from "../public/ei.png";

function Header() {
  return (
    <header className="bg-primary-900 flex place-content-center min-h-[4rem]">
      <div className="flex place-content-between container py-1">
        <div className="flex place-items-center">
          <Link className="flex place-items-center gap-1" href='/'>
            <Image alt="ei Noah Logo" src={ei} width={30} height={30} />
            <h1 className="text-xl">ei Noah</h1>
          </Link>
        </div>
        <div>
          <p>Mark</p>
        </div>
      </div>
    </header>
  );
}

export default Header;
